import {
  ChipLogEntry,
  ChipStagePublicData,
  ParticipantProfile,
  ParticipantStatus,
  convertLogEntryToPromptFormat,
  createChipTurn,
  getBaseStagePrompt,
  getParticipantProfilePromptContext,
  makeStructuredOutputPrompt,
  sortParticipantsByRandomProfile,
} from '@deliberation-lab/utils';
import {
  getFirestoreParticipant,
  getFirestoreStagePublicData,
} from '../utils/firestore';

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

/** Assemble chip chat prompt. */
export async function getChipChatPrompt(
  experimentId: string,
  participantId: string, // private ID
  profile: ParticipantProfileBase,
  agentConfig: ProfileAgentConfig, // TODO: Add to params
  pastStageContext: string,
  chatMessages: ChatMessage[],
  promptConfig: AgentChatPromptConfig,
  stageConfig: ChatStageConfig,
) {
  return [
    // TODO: Move profile context up one level
    getParticipantProfilePromptContext(
      profile,
      agentConfig?.promptContext ?? '',
    ),
    pastStageContext,
    await getChipStagePromptContext(
      experimentId,
      participantId,
      chatMessages,
      stageConfig,
      promptConfig.promptSettings.includeStageInfo,
    ),
    promptConfig.promptContext,
    makeStructuredOutputPrompt(promptConfig.structuredOutputConfig),
  ];
}

export async function getChipStagePromptContext(
  experimentId: string,
  participantId: string, // private ID
  logs: ChipLogEntry[],
  stageConfig: ChatStageConfig,
  includeStageInfo: boolean,
) {
  const participant = await getFirestoreParticipant(
    experimentId,
    participantId,
  );
  const publicData = await getFirestoreStagePublicData(
    experimentId,
    participant.currentCohortId,
    stageConfig.id,
  );

  const prompt = [
    getBaseStagePrompt(stageConfig, includeStageInfo),
    ``, // TODO: current status of everyone's chips
    logs.map((message) => convertLogEntryToPromptFormat(message)).join('\n'),
  ].join('\n');
  return prompt;
}

/** Get chip log messages for given cohort and stage ID. */
export async function getChipLogs(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<ChipLogEntry[]> {
  try {
    return (
      await app
        .firestore()
        .collection(
          `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}/logs`,
        )
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as ChipLogEntry);
  } catch (error) {
    console.log(error);
    return [];
  }
}
