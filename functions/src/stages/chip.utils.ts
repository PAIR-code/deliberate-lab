import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  ApiKeyType,
  ChipAssistanceMode,
  ChipOffer,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  ChipStagePublicData,
  ChipTransactionStatus,
  ExperimenterData,
  ParticipantProfile,
  ParticipantStatus,
  convertChipLogToPromptFormat,
  createChipInfoLogEntry,
  createChipOfferLogEntry,
  createChipOfferDeclinedLogEntry,
  createChipRoundLogEntry,
  createChipTransaction,
  createChipTurn,
  createChipTurnLogEntry,
  createModelGenerationConfig,
  generateId,
  getChipLogs,
  getChipOfferAssistanceAdvisorPrompt,
  getChipOfferAssistanceCoachPrompt,
  getChipOfferAssistanceDelegatePrompt,
  getChipResponseAssistanceAdvisorPrompt,
  getChipResponseAssistanceCoachPrompt,
  getChipResponseAssistanceDelegatePrompt,
  sortParticipantsByRandomProfile,
  CHIP_OFFER_ASSISTANCE_COACH_PROMPT,
  CHIP_OFFER_ASSISTANCE_DELEGATE_PROMPT,
  CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
  CHIP_OFFER_ASSISTANCE_STRUCTURED_OUTPUT_CONFIG,
  CHIP_RESPONSE_ASSISTANCE_COACH_STRUCTURED_OUTPUT_CONFIG,
  CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
} from '@deliberation-lab/utils';

import {processModelResponse} from '../agent.utils';
import {getFirestoreStagePublicDataRef} from '../utils/firestore';

import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';

/**
 * Get relevant (active), ordered participant public IDs for given cohort.
 * (used to check, e.g., if all participants have made an offer)
 */
export async function getChipParticipants(
  experimentId: string,
  cohortId: string,
) {
  const cohortParticipantsRef = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .where('currentCohortId', '==', cohortId)
    .orderBy('publicId', 'asc');

  const participants: ParticipantProfile = [];
  (await cohortParticipantsRef.get()).forEach((doc) => {
    // Check that participant is active for negotiation stage
    const participant = doc.data() as ParticipantProfile;
    if (
      participant.currentStatus === ParticipantStatus.IN_PROGRESS ||
      participant.currentStatus === ParticipantStatus.ATTENTION_CHECK
    ) {
      participants.push(participant);
    }
  });

  return participants;
}

/** Update chip negotiation public data current turn
 * (and round if applicable)
 */
export function updateChipCurrentTurn(
  publicStageData: ChipStagePublicData,
  participants: ParticipantProfile[],
  numRounds = 3,
) {
  if (participants.length === 0) {
    return publicStageData;
  }

  // Sort participants based on random hash
  // (if random hash not available, use public ID)
  const participantIds = sortParticipantsByRandomProfile(
    participants,
    publicStageData.id,
  ).map((p) => p.publicId);

  // Find first participant who has not yet made an offer
  const getTurnParticipant: string | null = (
    publicStageData: ChipStagePublicData,
    participantIds: string[],
  ) => {
    const round = publicStageData.currentRound;
    const roundMap = publicStageData.participantOfferMap[round];
    for (const participantId of participantIds) {
      if (!roundMap || !roundMap[participantId]) {
        return participantId;
      }
    }
    return null;
  };

  const nextParticipantId = getTurnParticipant(publicStageData, participantIds);

  // If all participants in current round have made offers,
  // increment round and use first participant
  if (!nextParticipantId) {
    publicStageData.currentRound += 1;
    publicStageData.currentTurn = participantIds[0];
  } else {
    publicStageData.currentTurn = nextParticipantId;
  }

  // If specified number of rounds is over, set isGameOver
  if (publicStageData.currentRound === numRounds) {
    publicStageData.isGameOver = true;
  }

  return publicStageData;
}

/** Update participant chip quantities. */
export async function updateParticipantChipQuantities(
  experimentId: string,
  stageId: string,
  publicId: string, // participant public ID
  addMap: Record<string, number>, // map of chip ID --> num chips to add
  removeMap: Record<string, number>, // map of chip ID --> num chips to remove
  publicStageData: ChipStagePublicData, // public stage data to update
) {
  const profiles = (
    await app
      .firestore()
      .collection(`experiments/${experimentId}/participants`)
      .where('publicId', '==', publicId)
      .get()
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);

  if (profiles.length !== 1) {
    // TODO: log failure with more than one participant with publicId
    return false;
  }

  const privateId = profiles[0].privateId;
  const answerDoc = app
    .firestore()
    .doc(
      `experiments/${experimentId}/participants/${privateId}/stageData/${stageId}`,
    );
  const answer = (await answerDoc.get()).data() as ChipStageParticipantAnswer;

  // Remove map items
  Object.keys(removeMap).forEach((chipId) => {
    const currentChips = answer.chipMap[chipId] ?? 0;
    const removeChips = removeMap[chipId];

    if (removeChips <= currentChips) {
      answer.chipMap[chipId] -= removeChips;
    } else {
      // TODO: Log failure
      return false;
    }
  });
  // Add map items
  Object.keys(addMap).forEach((chipId) => {
    const currentChips = answer.chipMap[chipId] ?? 0;
    const addChips = addMap[chipId];
    answer.chipMap[chipId] = currentChips + addChips;
  });

  // Update public stage data
  publicStageData.participantChipMap[publicId] = answer.chipMap;

  return {answerDoc, answer, publicStageData};
}

/** Update current turn/round if all participants have responded to
 * current offer.
 */
export async function updateChipTurn(
  experimentId: string,
  cohortId: string,
  stageConfig: ChipStageConfig,
  publicStage: ChipStagePublicData,
) {
  const stageId = stageConfig.id;

  // Define log entry collection reference
  const logCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('logs');

  // Define chip transaction collection reference
  const transactionCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('transactions');

  await app.firestore().runTransaction(async (transaction) => {
    const numRounds = stageConfig.numRounds;

    const currentRound = publicStage.currentRound;
    const currentTurn = publicStage.currentTurn;

    if (!publicStage.participantOfferMap[currentRound]) {
      return false;
    }

    const currentTransaction =
      publicStage.participantOfferMap[currentRound][currentTurn];

    // If no offer, no need to update
    if (!currentTransaction) {
      return false;
    }

    // Check all cohort participants for response to offer
    const participants = await getChipParticipants(experimentId, cohortId);
    const participantIds = participants.map((p) => p.publicId);

    const acceptedOffer: string[] = [];
    for (const participantId of participantIds) {
      if (
        participantId !== currentTurn &&
        !(participantId in currentTransaction.responseMap)
      ) {
        // If an active participant (not the current sender) has not
        // responded. do not proceed
        return false;
      } else if (
        participantId !== currentTurn &&
        currentTransaction.responseMap[participantId]?.response
      ) {
        // Track participants who accepted the current offer
        acceptedOffer.push(participantId);
      }
    }

    const timestamp = Timestamp.now();

    // If all (non-offer) participants have responded to the offer,
    // execute chip transaction
    const senderId = currentTurn;
    const recipientId =
      acceptedOffer.length > 0
        ? acceptedOffer[Math.floor(Math.random() * acceptedOffer.length)]
        : null;

    publicStage.participantOfferMap[currentRound][currentTurn].recipientId =
      recipientId;

    // Run chip offer transaction and write relevant logs
    if (recipientId !== null) {
      currentTransaction.status = ChipTransactionStatus.ACCEPTED;
      publicStage.participantOfferMap[currentRound][currentTurn] =
        currentTransaction;
      // Sender/recipient chips will be updated on chip transaction trigger
      transaction.set(transactionCollection.doc(), currentTransaction);
    } else {
      currentTransaction.status = ChipTransactionStatus.DECLINED;
      publicStage.participantOfferMap[currentRound][currentTurn] =
        currentTransaction;
      transaction.set(
        logCollection.doc(),
        createChipOfferDeclinedLogEntry(currentTransaction.offer, timestamp),
      );
    }

    // Then, update current turn
    publicStage.currentTurn = null;
    const oldCurrentRound = currentRound;
    const newData = updateChipCurrentTurn(publicStage, participants, numRounds);

    // Write logs
    if (newData.isGameOver) {
      transaction.set(
        logCollection.doc(),
        createChipInfoLogEntry('The game has ended.', timestamp),
      );
    } else {
      // Write new round log entry if applicable
      if (oldCurrentRound !== newData.currentRound) {
        transaction.set(
          logCollection.doc(),
          createChipRoundLogEntry(newData.currentRound, timestamp),
        );
      }
      // Write new turn entry
      transaction.set(
        logCollection.doc(),
        createChipTurnLogEntry(
          newData.currentRound,
          newData.currentTurn,
          timestamp,
        ),
      );
    }

    // Update public stage data
    transaction.set(
      await getFirestoreStagePublicDataRef(experimentId, cohortId, stageId),
      newData,
    );
  }); // end transaction

  return true;
}

export async function addChipOfferToPublicData(
  experimentId: string,
  cohortId: string,
  stageId: string,
  offer: ChipOffer,
) {
  // Define chip stage public data document reference
  const publicDoc = await getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  // Define log entry collection reference
  const logCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('logs');

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as ChipStagePublicData;
    const chipOffer = {...offer, timestamp: Timestamp.now()};
    const currentRound = publicStageData.currentRound;

    // Set current round for chip offer
    chipOffer.round = currentRound;

    // Confirm that offer is valid (it is the participant's turn to send offers
    // and there is not already an offer)
    if (
      chipOffer.senderId !== publicStageData.currentTurn ||
      (publicStageData.participantOfferMap[currentRound] &&
        publicStageData.participantOfferMap[currentRound][chipOffer.senderId])
    ) {
      return {success: false};
    }

    // Update participant offer map in public stage data
    if (!publicStageData.participantOfferMap[currentRound]) {
      publicStageData.participantOfferMap[currentRound] = {};
    }

    publicStageData.participantOfferMap[currentRound][chipOffer.senderId] =
      createChipTransaction(chipOffer);

    // Set new public data
    transaction.set(publicDoc, publicStageData);

    // Add log entry for chip offer
    transaction.set(
      logCollection.doc(),
      createChipOfferLogEntry(chipOffer, Timestamp.now()),
    );
  });

  return true;
}

export async function addChipResponseToPublicData(
  experimentId: string,
  cohortId: string,
  stageId: string,
  participantPublicId: string,
  chipResponse: boolean,
) {
  // Define chip stage public data document reference
  const publicDoc = await getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Confirm that offer is valid (ID matches the current offer ID)
    const publicStageData = (
      await publicDoc.get()
    ).data() as ChipStagePublicData;
    // TODO: Check offer ID
    if (!publicStageData.currentTurn) {
      return {success: false};
    }

    // Update participant offer map in public stage data
    // (mark current participant as having responded to current offer)
    const currentRound = publicStageData.currentRound;
    const currentTurn = publicStageData.currentTurn;
    if (
      !publicStageData.participantOfferMap[currentRound] ||
      !publicStageData.participantOfferMap[currentRound][currentTurn]
    ) {
      return {success: false};
    }
    publicStageData.participantOfferMap[currentRound][currentTurn].responseMap[
      participantPublicId
    ] = {response: chipResponse, timestamp: Timestamp.now()};

    // Set new public data
    transaction.set(publicDoc, publicStageData);
  });

  return true;
}

export async function getChipOfferAssistance(
  experimentId: string,
  stage: ChipStageConfig,
  publicData: ChipStagePublicData,
  participants: ParticipantProfile[], // participants in cohort
  participant: ParticipantProfile, // current participant
  participantAnswer: ChipStageParticipantAnswer,
  experimenterData: ExperimenterData,
  assistanceMode: ChipAssistanceMode,
  buyMap: Record<string, number> = {}, // for COACH mode only
  sellMap: Record<string, number> = {}, // for COACH mode only
) {
  // Player name
  const playerName = participant.name;

  // Player chip values
  const playerChipValues = Object.keys(participantAnswer.chipValueMap)
    .map(
      (chip) =>
        `${chip} chips = $${participantAnswer.chipValueMap[chip].toFixed(2)} each`,
    )
    .join(', ');

  // Player chip quantities
  const playerChipQuantities = Object.keys(participantAnswer.chipMap)
    .map((chip) => `${participantAnswer.chipMap[chip]} ${chip} chips`)
    .join(', ');

  // Player's proposed offer
  const sellChips = Object.keys(sellMap)
    .map((chip) => `${sellMap[chip]} ${chip} chips`)
    .join(', ');
  const buyChips = Object.keys(buyMap)
    .map((chip) => `${buyMap[chip]} ${chip} chips`)
    .join(', ');
  const offerIdea = `${sellChips} for ${buyChips}`;

  const participantChipMap = publicData.participantChipMap;
  const participantIds = Object.keys(participantChipMap);

  const participantDescriptions = participantIds.map((participantId) => {
    const chipMap = participantChipMap[participantId];
    const chipTypes = Object.keys(chipMap);
    const chipQuantities = chipTypes
      .map((chip) => `${chipMap[chip]} ${chip} chips`)
      .join(', ');
    return `${participantId}: ${chipQuantities}`;
  });
  const chipsetDescription = participantDescriptions.join(' | ');

  // Negotiation history
  const negotiationHistory = getChipLogs(
    stage,
    publicData,
    participants,
    participant.publicId,
  )
    .map((log) => convertChipLogToPromptFormat(log))
    .join('\n');

  // Number of rounds left
  const numRoundsLeft = stage.numRounds - (publicData.currentRound + 1);

  // Model settings
  const modelSettings: AgentModelSettings = {
    apiType: ApiKeyType.GEMINI_API_KEY,
    modelName: 'gemini-2.5-flash',
  };
  const modelGenerationConfig = createModelGenerationConfig({
    reasoningBudget: 2048,
    includeReasoning: true,
  });

  // Helper function to parse structured output response
  const parseResponse = (response: ModelResponse, sendOffer = false) => {
    try {
      const responseObj = response.parsedResponse;
      if (sendOffer) {
        const buy: Record<string, number> = {};
        const sell: Record<string, number> = {};
        //  changing the chip IDs to uppercase, specific to the Chip Negotiation game
        const buyType = responseObj['suggestedBuyType']?.toUpperCase();
        const sellType = responseObj['suggestedSellType']?.toUpperCase();

        if (buyType && typeof responseObj['suggestedBuyQuantity'] === 'number') {
          buy[buyType] = responseObj['suggestedBuyQuantity'];
        }
        if (sellType && typeof responseObj['suggestedSellQuantity'] === 'number') {
          sell[sellType] = responseObj['suggestedSellQuantity'];
        }
        console.log(buy, sell);
        addChipOfferToPublicData(
          experimentId,
          participant.currentCohortId,
          stage.id,
          {
            id: generateId(),
            round: publicData.currentRound,
            senderId: participant.publicId,
            buy,
            sell,
            timestamp: Timestamp.now(),
          },
        );
      }
      console.log(
        `Suggested: Give ${responseObj['suggestedSellQuantity']} ${responseObj['suggestedSellType']} to get ${responseObj['suggestedBuyQuantity']} ${responseObj['suggestedBuyType']} (${responseObj['reasoning']})`,
      );
      return {success: true, modelResponse: responseObj};
    } catch (errorMessage) {
      // Response is already logged in console during Gemini API call
      console.log('Could not parse JSON:', errorMessage);
      return {success: false, errorMessage};
    }
  };

  // Call different LLM API prompt based on assistance mode
  switch (assistanceMode) {
    case ChipAssistanceMode.COACH:
      // Construct prompt using helper function
      const coachPrompt = getChipOfferAssistanceCoachPrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
        offerIdea,
      );
      console.log('Chip offer assistance coach prompt:', coachPrompt);
      // Call API
      const coachResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        coachPrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_OFFER_ASSISTANCE_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(coachResponse);
    case ChipAssistanceMode.ADVISOR:
      // Construct prompt using helper function
      const advisorPrompt = getChipOfferAssistanceAdvisorPrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
      );
      console.log('Chip offer assistance advisor prompt:', advisorPrompt);
      // Call API
      const advisorResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        advisorPrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(advisorResponse);
    case ChipAssistanceMode.DELEGATE:
      // Construct prompt using helper function
      const delegatePrompt = getChipOfferAssistanceDelegatePrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
      );
      console.log('Chip offer assistance delegate prompt:', delegatePrompt);
      // Call API
      const delegateResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        delegatePrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(delegateResponse, true);
    default:
      return '';
  }
}

export async function getChipResponseAssistance(
  experimentId: string,
  stage: ChipStageConfig,
  publicData: ChipStagePublicData,
  participants: ParticipantProfile[], // participants in cohort
  participant: ParticipantProfile, // current participant
  participantAnswer: ChipStageParticipantAnswer,
  experimenterData: ExperimenterData,
  assistanceMode: ChipAssistanceMode,
  currentOffer: ChipOffer,
  responseIdea: boolean,
) {
  // Player name
  const playerName = participant.name;

  // Player chip values
  const playerChipValues = Object.keys(participantAnswer.chipValueMap)
    .map(
      (chip) =>
        `${chip} chips = $${participantAnswer.chipValueMap[chip].toFixed(2)} each`,
    )
    .join(', ');

  // Player chip quantities
  const playerChipQuantities = Object.keys(participantAnswer.chipMap)
    .map((chip) => `${participantAnswer.chipMap[chip]} ${chip} chips`)
    .join(', ');

  // Player's proposed offer
  const sellChips = Object.keys(currentOffer.sell)
    .map((chip) => `${currentOffer.sell[chip]} ${chip} chips`)
    .join(', ');
  const buyChips = Object.keys(currentOffer.buy)
    .map((chip) => `${currentOffer.buy[chip]} ${chip} chips`)
    .join(', ');
  const offer = `You will give ${buyChips} and get ${sellChips}`;

  const participantChipMap = publicData.participantChipMap;
  const participantIds = Object.keys(participantChipMap);

  const participantDescriptions = participantIds.map((participantId) => {
    const chipMap = participantChipMap[participantId];
    const chipTypes = Object.keys(chipMap);
    const chipQuantities = chipTypes
      .map((chip) => `${chipMap[chip]} ${chip} chips`)
      .join(', ');
    return `${participantId}: ${chipQuantities}`;
  });
  const chipsetDescription = participantDescriptions.join(' | ');

  // Negotiation history
  const negotiationHistory = getChipLogs(
    stage,
    publicData,
    participants,
    participant.publicId,
  )
    .map((log) => convertChipLogToPromptFormat(log))
    .join('\n');

  // Number of rounds left
  const numRoundsLeft = stage.numRounds - (publicData.currentRound + 1);

  // Model settings
  const modelSettings: AgentModelSettings = {
    apiType: ApiKeyType.GEMINI_API_KEY,
    modelName: 'gemini-2.5-flash',
  };
  const modelGenerationConfig = createModelGenerationConfig({
    reasoningBudget: 2048,
    includeReasoning: true,
  });

  // Helper function to parse structured output response
  const parseResponse = (response: ModelResponse, sendResponse = false) => {
    try {
      const responseObject = response.parsedResponse;
      if (sendResponse) {
        addChipResponseToPublicData(
          experimentId,
          participant.currentCohortId,
          stage.id,
          participant.publicId,
          responseObject['response'],
        );
      }
      console.log(
        `${responseObject['response']} ${responseObject['feedback']}`,
      );
      return {success: true, modelResponse: responseObject};
    } catch (errorMessage) {
      // Response is already logged in console during Gemini API call
      console.log('Could not parse JSON:', errorMessage);
      return {success: false, errorMessage};
    }
  };

  // Call different LLM API prompt based on assistance mode
  switch (assistanceMode) {
    case ChipAssistanceMode.COACH:
      // Construct prompt using helper function
      const coachPrompt = getChipResponseAssistanceCoachPrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
        offer,
        responseIdea,
      );
      console.log('Chip response assistance coach prompt:', coachPrompt);
      // Call API
      const coachResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        coachPrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_RESPONSE_ASSISTANCE_COACH_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(coachResponse);
    case ChipAssistanceMode.ADVISOR:
      // Construct prompt using helper function
      const advisorPrompt = getChipResponseAssistanceAdvisorPrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
        offer,
      );
      console.log('Chip response assistance advisor prompt:', advisorPrompt);
      // Call API
      const advisorResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        advisorPrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(advisorResponse);
    case ChipAssistanceMode.DELEGATE:
      // Construct prompt using helper function
      const delegatePrompt = getChipResponseAssistanceDelegatePrompt(
        playerName,
        playerChipValues,
        playerChipQuantities,
        chipsetDescription,
        negotiationHistory,
        numRoundsLeft,
        offer,
      );
      console.log('Chip response assistance delegate prompt:', delegatePrompt);
      // Call API
      const delegateResponse = await processModelResponse(
        experimentId,
        participant.currentCohortId,
        participant.privateId,
        stage.id,
        participant, // NOTE: This should actually be the agent profile
        '', // No agent private ID
        '', // No agent public ID
        '', // No description
        experimenterData.apiKeys,
        delegatePrompt,
        modelSettings,
        modelGenerationConfig,
        CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG,
      );
      // Parse response before returning
      return parseResponse(delegateResponse, true);
    default:
      return '';
  }
}
