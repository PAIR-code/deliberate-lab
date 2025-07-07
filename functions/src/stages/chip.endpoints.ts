import {Value} from '@sinclair/typebox/value';
import {
  ChipAssistanceMode,
  ChipAssistanceMove,
  ChipAssistanceType,
  ChipLogEntry,
  ChipOfferStatus,
  ChipStageConfig,
  ChipStagePublicData,
  SendChipOfferData,
  displayChipOfferText,
  SendChipResponseData,
  SetChipTurnData,
  StageKind,
  createChipOffer,
  createChipOfferLogEntry,
  createChipRoundLogEntry,
  createChipTurnLogEntry,
  createChipTransaction,
  generateId,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {
  getExperimenterDataFromExperiment,
  getFirestoreCohortParticipants,
  getFirestoreParticipant,
  getFirestoreParticipants,
  getFirestoreParticipantAnswer,
  getFirestoreParticipantAnswerRef,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

import {
  addChipOfferToPublicData,
  addChipResponseToPublicData,
  getChipOfferAssistance,
  getChipParticipants,
  getChipResponseAssistance,
  updateChipCurrentTurn,
} from './chip.utils';

/** Manage chip negotiation offers. */

// ************************************************************************* //
// setChipTurn endpoint                                                      //
//                                                                           //
// If game is not over, set current turn based on first participant in       //
// cohort who has not yet submitted an offer for the current round           //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId                                         //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const setChipTurn = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SetChipTurnData, data);
  if (!validInput) {
    handleSetChipTurnValidationErrors(data);
  }

  // Define chip stage config
  const stageDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('stages')
    .doc(data.stageId);

  // Define chip stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Define log entry collection reference
  const logCollection = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId)
    .collection('logs');

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as ChipStagePublicData;

    // If turn is already set, then no action needed
    if (publicStageData.currentTurn !== null) {
      return {success: false};
    }

    // Get relevant (active, in cohort) participant IDs
    const participants = await getChipParticipants(
      data.experimentId,
      data.cohortId,
    );

    // If no participants, then no action needed
    if (participants.length === 0) {
      return {success: false};
    }

    const stageConfig = (await stageDoc.get()).data() as ChipStageConfig;

    const newData = updateChipCurrentTurn(
      publicStageData,
      participants,
      stageConfig.numRounds,
    );

    transaction.set(publicDoc, newData);
    transaction.set(
      logCollection.doc(),
      createChipRoundLogEntry(newData.currentRound, Timestamp.now()),
    );
    transaction.set(
      logCollection.doc(),
      createChipTurnLogEntry(
        newData.currentRound,
        newData.currentTurn,
        Timestamp.now(),
      ),
    );
  }); // end transaction

  return {success: true};
});

// ************************************************************************* //
// sendChipOffer endpoint                                                    //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, participantPrivateId, participantPublicId, cohortId,      //
//   stageId, chipOffer                                                      //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //

export const sendChipOffer = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendChipOfferData, data);
  if (!validInput) {
    handleSendChipOfferValidationErrors(data);
  }

  // Add chip offer to public data
  const success = await addChipOfferToPublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
    data.chipOffer,
  );

  // If success, move current assistance to history
  // TODO: Refactor into helper function
  if (success) {
    const participantAnswer = await getFirestoreParticipantAnswer(
      data.experimentId,
      data.participantPrivateId,
      data.stageId,
    );
    if (!participantAnswer) return {data: ''};
    if (participantAnswer.currentAssistance) {
      participantAnswer.currentAssistance.finalOffer = data.chipOffer;
      participantAnswer.currentAssistance.endTime = Timestamp.now();
      participantAnswer.assistanceHistory.push(
        participantAnswer.currentAssistance,
      );
      participantAnswer.currentAssistance = null;
    }

    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(
        getFirestoreParticipantAnswerRef(
          data.experimentId,
          data.participantPrivateId,
          data.stageId,
        ),
        participantAnswer,
      );
    });
  }

  return {success};
});

// ************************************************************************* //
// sendChipResponse endpoint                                                 //
// Send true/false response to current chip offer                            //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, participantPrivateId, participantPublicId, cohortId,      //
//   stageId, chipResponse                                                   //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const sendChipResponse = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendChipResponseData, data);
  if (!validInput) {
    handleSendChipResponseValidationErrors(data);
  }

  const success = addChipResponseToPublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
    data.participantPublicId,
    data.chipResponse,
  );

  // If success, move current assistance to history
  // TODO: Refactor into helper function
  if (success) {
    const participantAnswer = await getFirestoreParticipantAnswer(
      data.experimentId,
      data.participantPrivateId,
      data.stageId,
    );
    if (!participantAnswer) return {data: ''};
    if (participantAnswer.currentAssistance) {
      participantAnswer.currentAssistance.finalResponse = data.chipResponse;
      participantAnswer.currentAssistance.endTime = Timestamp.now();
      participantAnswer.assistanceHistory.push(
        participantAnswer.currentAssistance,
      );
      participantAnswer.currentAssistance = null;
    }

    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(
        getFirestoreParticipantAnswerRef(
          data.experimentId,
          data.participantPrivateId,
          data.stageId,
        ),
        participantAnswer,
      );
    });
  }

  return {success};
});

// ************************************************************************* //
// requestChipAssistance endpoint                                            //
// Returns LLM API response to requested assistance with chip offer/response //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId,                                        //
//   participantId, assistanceMode,                                          //
//   (optionally filled for coach mode: buyMap, sellMap, offerResponse)      //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const requestChipAssistance = onCall(async (request) => {
  const {data} = request;

  const requestTime = Timestamp.now(); // used for chip assistance

  const participant = await getFirestoreParticipant(
    data.experimentId,
    data.participantId,
  );
  if (!participant) return {data: ''};

  const participantAnswer = await getFirestoreParticipantAnswer(
    data.experimentId,
    data.participantId,
    data.stageId,
  );
  if (!participantAnswer) return {data: ''};

  const stage = await getFirestoreStage(data.experimentId, data.stageId);
  if (stage?.kind !== StageKind.CHIP) return {data: ''};

  const publicData = await getFirestoreStagePublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
  );
  if (publicData?.kind !== StageKind.CHIP) return {data: ''};

  // If not current participant, give chip response assistance with response
  if (publicData.currentTurn !== participant.publicId) {
    const roundMap =
      publicData.participantOfferMap[publicData.currentRound] ?? {};
    const currentOffer = roundMap[publicData.currentTurn].offer;
    if (!currentOffer) {
      return {data: null};
    }

    const response = await getChipResponseAssistance(
      data.experimentId,
      stage,
      publicData,
      await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
      participant,
      participantAnswer,
      await getExperimenterDataFromExperiment(data.experimentId),
      data.assistanceMode,
      currentOffer,
      data.offerResponse,
    );

    // If response is valid, add to current assistance
    // If in coach assistance mode, record the proposed response and model feedback
    if (data.assistanceMode === ChipAssistanceMode.COACH && response.success) {
      const participantAnswer = await getFirestoreParticipantAnswer(
        data.experimentId,
        data.participantId,
        data.stageId,
      );
      if (participantAnswer?.currentAssistance) {
        const currentAssistance = participantAnswer.currentAssistance;
        currentAssistance.proposedResponse = data.offerResponse;
        currentAssistance.message =
          response.modelResponse['feedback'] ??
          response.modelResponse['tradeExplanation'] ??
          '';
        currentAssistance.reasoning = response.modelResponse['reasoning'] ?? '';
        currentAssistance.modelResponse = response.modelResponse;
        currentAssistance.proposedTime = requestTime;
        participantAnswer.currentAssistance = currentAssistance;

        await app.firestore().runTransaction(async (transaction) => {
          transaction.set(
            getFirestoreParticipantAnswerRef(
              data.experimentId,
              data.participantId,
              data.stageId,
            ),
            participantAnswer,
          );
        });
      }
    }

    return response;
  }

  // Otherwise, assist with offer
  const response = await getChipOfferAssistance(
    data.experimentId,
    stage,
    publicData,
    await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
    participant,
    participantAnswer,
    await getExperimenterDataFromExperiment(data.experimentId),
    data.assistanceMode,
    data.buyMap ?? {},
    data.sellMap ?? {},
  );

  // If in coach assistance mode, record the proposed offer and model feedback
  if (data.assistanceMode === ChipAssistanceMode.COACH && response.success) {
    const participantAnswer = await getFirestoreParticipantAnswer(
      data.experimentId,
      data.participantId,
      data.stageId,
    );
    if (participantAnswer?.currentAssistance) {
      const currentAssistance = participantAnswer.currentAssistance;
      currentAssistance.proposedOffer = createChipOffer({
        round: publicData.currentRound,
        senderId: participant.publicId,
        buy: data.buyMap,
        sell: data.sellMap,
        timestamp: requestTime,
      });
      currentAssistance.message =
        response.modelResponse['feedback'] ??
        response.modelResponse['tradeExplanation'] ??
        '';
      currentAssistance.reasoning = response.modelResponse['reasoning'] ?? '';
      currentAssistance.modelResponse = response.modelResponse;
      currentAssistance.proposedTime = requestTime;
      participantAnswer.currentAssistance = currentAssistance;

      await app.firestore().runTransaction(async (transaction) => {
        transaction.set(
          getFirestoreParticipantAnswerRef(
            data.experimentId,
            data.participantId,
            data.stageId,
          ),
          participantAnswer,
        );
      });
    }
  }

  return response;
});

// ************************************************************************* //
// selectChipAssistanceMode endpoint                                         //
// Creates new ChipAssistanceMove as current participant move                //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId,                                        //
//   participantId, assistanceMode,                                          //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const selectChipAssistanceMode = onCall(async (request) => {
  const {data} = request;

  const participant = await getFirestoreParticipant(
    data.experimentId,
    data.participantId,
  );
  if (!participant) return {data: ''};

  const participantAnswer = await getFirestoreParticipantAnswer(
    data.experimentId,
    data.participantId,
    data.stageId,
  );
  if (!participantAnswer) return {data: ''};

  const publicData = await getFirestoreStagePublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
  );
  if (publicData?.kind !== StageKind.CHIP) return {data: ''};

  // Get current round and turn
  const round = publicData.currentRound;
  const turn = publicData.currentTurn;
  if (!turn) {
    console.log('Current turn in public chip data is empty', turn);
    return {data: ''};
  }

  // Re-enable check if participant answer already has current assistance
  if (participantAnswer.currentAssistance) {
    console.log('Current assistance already set!');
    return {data: ''};
  }

  const currentAssistance: ChipAssistanceMove = {
    round,
    turn,
    type:
      turn === participant.publicId
        ? ChipAssistanceType.OFFER
        : ChipAssistanceType.RESPONSE,
    selectedMode: data.assistanceMode,
    selectedTime: Timestamp.now(),
    proposedTime: null,
    endTime: null,
    message: null,
    reasoning: null,
    modelResponse: {},
  };

  // If advisor or delegate, immediately call model
  if (
    data.assistanceMode === ChipAssistanceMode.ADVISOR ||
    data.assistanceMode === ChipAssistanceMode.DELEGATE
  ) {
    const stage = await getFirestoreStage(data.experimentId, data.stageId);
    if (stage?.kind !== StageKind.CHIP) return {data: ''};

    // If not current participant, give chip response assistance with offer
    if (publicData.currentTurn !== participant.publicId) {
      const roundMap =
        publicData.participantOfferMap[publicData.currentRound] ?? {};
      const currentOffer = roundMap[publicData.currentTurn].offer;
      if (!currentOffer) {
        return {data: null};
      }

      const response = await getChipResponseAssistance(
        data.experimentId,
        stage,
        publicData,
        await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
        participant,
        participantAnswer,
        await getExperimenterDataFromExperiment(data.experimentId),
        data.assistanceMode,
        currentOffer,
        data.offerResponse,
      );
      // If response is valid, add to current assistance
      if (response.success) {
        currentAssistance.proposedResponse = response.modelResponse['response'];
        currentAssistance.message = response.modelResponse['feedback'] ?? '';
        currentAssistance.reasoning = response.modelResponse['reasoning'] ?? '';
        currentAssistance.modelResponse = response.modelResponse;
      }
      currentAssistance.proposedTime = Timestamp.now();
    }

    // Otherwise, assist with offer
    const response = await getChipOfferAssistance(
      data.experimentId,
      stage,
      publicData,
      await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
      participant,
      participantAnswer,
      await getExperimenterDataFromExperiment(data.experimentId),
      data.assistanceMode,
      data.buyMap ?? {},
      data.sellMap ?? {},
    );
    // If response is valid, add to current assistance
    if (response.success) {
      const buy: Record<string, number> = {};
      buy[response.modelResponse['suggestedBuyType']] =
        response.modelResponse['suggestedBuyQuantity'];
      const sell: Record<string, number> = {};
      sell[response.modelResponse['suggestedSellType']] =
        response.modelResponse['suggestedSellQuantity'];

      currentAssistance.proposedOffer = createChipOffer({
        round,
        senderId: participant.publicId,
        buy,
        sell,
        timestamp: Timestamp.now(),
      });
      currentAssistance.message =
        response.modelResponse['feedback'] ??
        response.modelResponse['tradeExplanation'] ??
        '';
      currentAssistance.reasoning = response.modelResponse['reasoning'] ?? '';
      currentAssistance.modelResponse = response.modelResponse;
    }
    currentAssistance.proposedTime = Timestamp.now();
  }

  // If delegate, assistance is over
  if (data.assistanceMode === ChipAssistanceMode.DELEGATE) {
    currentAssistance.endTime = Timestamp.now();
  }

  // For all modes, write current assistance to participant answer
  if (currentAssistance.endTime) {
    participantAnswer.assistanceHistory.push(currentAssistance);
  } else {
    participantAnswer.currentAssistance = currentAssistance;
  }
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(
      getFirestoreParticipantAnswerRef(
        data.experimentId,
        data.participantId,
        data.stageId,
      ),
      participantAnswer,
    );
  });
});

// ************************************************************************* //
// VALIDATION FUNCTIONS                                                      //
// ************************************************************************* //

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSetChipTurnValidationErrors(data: any) {
  for (const error of Value.Errors(SetChipTurnData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSendChipOfferValidationErrors(data: any) {
  for (const error of Value.Errors(SendChipOfferData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSendChipResponseValidationErrors(data: any) {
  for (const error of Value.Errors(SendChipResponseData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}
