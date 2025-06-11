import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import {
  CohortConfig,
  ExperimenterData,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageParticipantAnswer,
  StagePublicData,
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

/** Return all agent personas for a given experiment. */
export async function getAgentPersonas(experimentId: string) {
  const agentCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agents');
  return (await agentCollection.get()).docs.map(
    (agent) => agent.data() as AgentPersonaConfig,
  );
}

/** Return agent participant prompt that corresponds to agent. */
export async function getAgentParticipantPrompt(
  experimentId: string,
  stageId: string,
  agentId: string,
): AgentParticipantPromptConfig | null {
  const prompt = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agents')
    .doc(agentId)
    .collection('participantPrompts')
    .doc(stageId)
    .get();

  if (!prompt.exists) {
    return null;
  }
  return prompt.data() as AgentParticipantPromptConfig;
}
