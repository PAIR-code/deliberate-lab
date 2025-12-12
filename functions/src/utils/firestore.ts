import {
  AgentPersonaConfig,
  ChatMessage,
  CohortConfig,
  Experiment,
  ExperimenterData,
  MediatorPromptConfig,
  MediatorProfileExtended,
  MediatorStatus,
  ParticipantPromptConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageParticipantAnswer,
  StagePublicData,
  getParticipantDisplayName,
} from '@deliberation-lab/utils';

import {app} from '../app';

/** Utils functions for handling Firestore docs. */

/** Get experimenter data. */
export async function getExperimenterData(creatorId: string) {
  const creatorDoc = await app
    .firestore()
    .collection('experimenterData')
    .doc(creatorId)
    .get();
  const experimenterData = creatorDoc.exists
    ? (creatorDoc.data() as ExperimenterData)
    : undefined;
  return experimenterData;
}

/** Get experimenter data from experiment ID. */
export async function getExperimenterDataFromExperiment(experimentId: string) {
  const experimentDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .get();
  if (!experimentDoc) {
    return undefined;
  }
  const creatorId = experimentDoc.data().metadata.creator;
  return await getExperimenterData(creatorId);
}

/** Return ref for experiment doc. */
export function getFirestoreExperimentRef(experimentId: string) {
  return app.firestore().collection('experiments').doc(experimentId);
}

/** Fetch experiment from Firestore */
export async function getFirestoreExperiment(experimentId: string) {
  const ref = getFirestoreExperimentRef(experimentId);

  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as Experiment;
}

/** Return ref for participant doc. */
export function getFirestoreParticipantRef(
  experimentId: string,
  participantId: string,
) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId);
}

/** Fetch participant from Firestore. */
export async function getFirestoreParticipant(
  experimentId: string,
  participantId: string,
) {
  const ref = getFirestoreParticipantRef(experimentId, participantId);
  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as ParticipantProfileExtended;
}

/** Fetch participants for current cohort. */
export async function getFirestoreCohortParticipants(
  experimentId: string,
  cohortId: string,
) {
  return (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .where('currentCohortId', '==', cohortId)
      .get()
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);
}

/** Fetch active mediators for current cohort/stage. */
export async function getFirestoreActiveMediators(
  experimentId: string,
  cohortId: string,
  stageId: string | null = null, // if null, can be in any stage
  checkIsAgent = false, // whether to check if participant is agent
) {
  const activeMediators = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('mediators')
      .where('currentCohortId', '==', cohortId)
      .get()
  ).docs
    .map((doc) => doc.data() as MediatorProfileExtended)
    .filter(
      (participant) =>
        participant.currentStatus === MediatorStatus.ACTIVE &&
        (checkIsAgent ? participant.agentConfig : true),
    );
  return activeMediators;
}

/** Fetch active participants for current cohort/stage. */
export async function getFirestoreActiveParticipants(
  experimentId: string,
  cohortId: string,
  stageId: string | null = null, // if null, can be in any stage
  checkIsAgent = false, // whether to check if participant is agent
) {
  // TODO: Use isActiveParticipant utils function.
  const activeStatuses = [
    ParticipantStatus.IN_PROGRESS,
    ParticipantStatus.SUCCESS,
    ParticipantStatus.ATTENTION_CHECK,
  ];
  const activeParticipants = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .where('currentCohortId', '==', cohortId)
      .get()
  ).docs
    .map((doc) => doc.data() as ParticipantProfileExtended)
    .filter(
      (participant) =>
        (stageId !== null ? participant.currentStageId === stageId : true) &&
        (checkIsAgent ? participant.agentConfig : true) &&
        activeStatuses.find((status) => status === participant.currentStatus),
    );
  return activeParticipants;
}

/** Return ref for cohort config. */
export function getFirestoreCohortRef(experimentId: string, cohortId: string) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId);
}

/** Fetch CohortConfig from Firestore. */
export async function getFirestoreCohort(
  experimentId: string,
  cohortId: string,
) {
  const ref = getFirestoreCohortRef(experimentId, cohortId);
  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as CohortConfig;
}

/** Return ref for stage config. */
export function getFirestoreStageRef(experimentId: string, stageId: string) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('stages')
    .doc(stageId);
}

/** Fetch StageConfig from Firestore. */
export async function getFirestoreStage(experimentId: string, stageId: string) {
  const ref = getFirestoreStageRef(experimentId, stageId);
  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as StageConfig;
}

/** Return ref for stage answer doc. */
export function getFirestoreParticipantAnswerRef(
  experimentId: string,
  participantId: string, // private ID
  stageId: string,
) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('stageData')
    .doc(stageId);
}

/** Fetch participant answer from Firestore. */
export async function getFirestoreParticipantAnswer(
  experimentId: string,
  participantId: string, // private ID
  stageId: string,
) {
  const ref = getFirestoreParticipantAnswerRef(
    experimentId,
    participantId,
    stageId,
  );
  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as StageParticipantAnswer;
}

/** Fetch a mapping of participantId: answer. */
export async function getFirestoreAnswersForStage<
  T extends StageParticipantAnswer,
>(
  experimentId: string,
  cohortId: string,
  stageId: string,
  participants: ParticipantProfileExtended[],
  profileSetId = '', // used for fetching display names
): Promise<
  Array<{
    participantPublicId: string;
    participantDisplayName: string;
    answer: T;
  }>
> {
  const answers: Array<{
    participantPublicId: string;
    participantDisplayName: string;
    answer: T;
  }> = [];
  await Promise.all(
    participants.map(async (participant) => {
      const answer = await getFirestoreParticipantAnswer(
        experimentId,
        participant.privateId,
        stageId,
      );
      if (answer) {
        answers.push({
          participantPublicId: participant.publicId,
          participantDisplayName: getParticipantDisplayName(
            participant,
            profileSetId,
            true, // include avatars
            true, // include pronouns
          ),
          answer: answer as T,
        });
      }
    }),
  );

  return answers;
}

/** Return ref for stage public data doc. */
export function getFirestoreStagePublicDataRef(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId);
}

/** Get trigger log reference for group chat stages */
export function getGroupChatTriggerLogRef(
  experimentId: string,
  cohortId: string,
  stageId: string,
  triggerLogId: string,
) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(triggerLogId);
}

/** Get trigger log reference for private chat stages */
export function getPrivateChatTriggerLogRef(
  experimentId: string,
  participantId: string,
  stageId: string,
  triggerLogId: string,
) {
  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('stageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(triggerLogId);
}

/** Fetch stage public data from Firestore. */
export async function getFirestoreStagePublicData(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  const ref = getFirestoreStagePublicDataRef(experimentId, cohortId, stageId);
  const doc = await ref.get();
  if (!doc.exists) return undefined;

  return doc.data() as StagePublicData;
}

/** Return all agent mediator personas for a given experiment. */
export async function getAgentMediatorPersonas(experimentId: string) {
  const agentCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agentMediators');

  return (await agentCollection.get()).docs.map(
    (agent) => agent.data() as AgentPersonaConfig,
  );
}

/** Return agent mediator prompt that corresponds to agent. */
export async function getAgentMediatorPrompt(
  experimentId: string,
  stageId: string,
  agentId: string,
): Promise<MediatorPromptConfig | null> {
  const prompt = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agentMediators')
    .doc(agentId)
    .collection('prompts')
    .doc(stageId)
    .get();

  if (!prompt.exists) {
    return null;
  }
  return prompt.data() as MediatorPromptConfig;
}

/** Return agent participant prompt that corresponds to agent. */
export async function getAgentParticipantPrompt(
  experimentId: string,
  stageId: string,
  agentId: string,
): Promise<ParticipantPromptConfig | null> {
  if (!agentId) {
    return null;
  }

  const prompt = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agentParticipants')
    .doc(agentId)
    .collection('prompts')
    .doc(stageId)
    .get();

  if (!prompt.exists) {
    return null;
  }
  return prompt.data() as ParticipantPromptConfig;
}

/** Get group chat messages for given cohort and stage ID. */
export async function getFirestorePublicStageChatMessages(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<ChatMessage[]> {
  try {
    return (
      await app
        .firestore()
        .collection(
          `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}/chats`,
        )
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as ChatMessage);
  } catch (error) {
    console.log(error);
    return [];
  }
}

/** Get private chat messages for given participant and stage ID. */
export async function getFirestorePrivateChatMessages(
  experimentId: string,
  participantId: string,
  stageId: string,
): Promise<ChatMessage[]> {
  try {
    return (
      await app
        .firestore()
        .collection(
          `experiments/${experimentId}/participants/${participantId}/stageData/${stageId}/privateChats`,
        )
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as ChatMessage);
  } catch (error) {
    console.log(error);
    return [];
  }
}
