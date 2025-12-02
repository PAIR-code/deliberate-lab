/**
 * Data download utilities for Firebase Admin SDK
 */

import {Firestore} from 'firebase-admin/firestore';
import {
  AgentMediatorPersonaConfig,
  AgentMediatorTemplate,
  AgentParticipantPersonaConfig,
  AgentParticipantTemplate,
  AlertMessage,
  ChatMessage,
  CohortConfig,
  createCohortDownload,
  createExperimentDownload,
  createParticipantDownload,
  Experiment,
  ExperimentDownload,
  MediatorPromptConfig,
  ParticipantProfileExtended,
  ParticipantPromptConfig,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
} from '@deliberation-lab/utils';
import {convertTimestamps} from './data.utils';

/**
 * Options for getExperimentDownload
 */
export interface GetExperimentDownloadOptions {
  /** Whether to include participant, cohort, and alert data. Defaults to true. */
  includeParticipantData?: boolean;
}

/**
 * Build a complete ExperimentDownload structure using Firebase Admin SDK.
 *
 * @param firestore - Firestore instance from firebase-admin/firestore
 * @param experimentId - ID of the experiment to download
 * @param options - Options for what data to include
 * @returns Complete experiment download data, or null if experiment not found
 */
export async function getExperimentDownload(
  firestore: Firestore,
  experimentId: string,
  options: GetExperimentDownloadOptions = {},
): Promise<ExperimentDownload | null> {
  const {includeParticipantData = true} = options;

  // Get experiment config from experimentId
  const experimentConfig = (
    await firestore.collection('experiments').doc(experimentId).get()
  ).data() as Experiment | undefined;

  if (!experimentConfig) {
    return null;
  }

  // Create experiment download using experiment config
  const experimentDownload = createExperimentDownload(experimentConfig);

  // For each experiment stage config, add to ExperimentDownload
  const stageConfigs = (
    await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .get()
  ).docs.map((doc) => doc.data() as StageConfig);
  for (const stage of stageConfigs) {
    experimentDownload.stageMap[stage.id] = stage;
  }

  // For each agent mediator, add template
  const mediatorAgents = (
    await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('agentMediators')
      .get()
  ).docs.map((agent) => agent.data() as AgentMediatorPersonaConfig);
  for (const persona of mediatorAgents) {
    const mediatorPrompts = (
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('agentMediators')
        .doc(persona.id)
        .collection('prompts')
        .get()
    ).docs.map((doc) => doc.data() as MediatorPromptConfig);
    const mediatorTemplate: AgentMediatorTemplate = {
      persona,
      promptMap: {},
    };
    mediatorPrompts.forEach((prompt) => {
      mediatorTemplate.promptMap[prompt.id] = prompt;
    });
    // Add to ExperimentDownload
    experimentDownload.agentMediatorMap[persona.id] = mediatorTemplate;
  }

  // For each agent participant, add template
  const participantAgents = (
    await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('agentParticipants')
      .get()
  ).docs.map((agent) => agent.data() as AgentParticipantPersonaConfig);
  for (const persona of participantAgents) {
    const participantPrompts = (
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('agentParticipants')
        .doc(persona.id)
        .collection('prompts')
        .get()
    ).docs.map((doc) => doc.data() as ParticipantPromptConfig);
    const participantTemplate: AgentParticipantTemplate = {
      persona,
      promptMap: {},
    };
    participantPrompts.forEach((prompt) => {
      participantTemplate.promptMap[prompt.id] = prompt;
    });
    // Add to ExperimentDownload
    experimentDownload.agentParticipantMap[persona.id] = participantTemplate;
  }

  if (includeParticipantData) {
    // For each participant, add ParticipantDownload
    const profiles = (
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .get()
    ).docs.map((doc) => doc.data() as ParticipantProfileExtended);
    for (const profile of profiles) {
      // Create new ParticipantDownload
      const participantDownload = createParticipantDownload(profile);

      // For each stage answer, add to ParticipantDownload map
      const stageAnswers = (
        await firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .doc(profile.privateId)
          .collection('stageData')
          .get()
      ).docs.map((doc) => doc.data() as StageParticipantAnswer);
      for (const stage of stageAnswers) {
        participantDownload.answerMap[stage.id] = stage;
      }
      // Add ParticipantDownload to ExperimentDownload
      experimentDownload.participantMap[profile.publicId] = participantDownload;
    }

    // For each cohort, add CohortDownload
    const cohorts = (
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('cohorts')
        .get()
    ).docs.map((cohort) => cohort.data() as CohortConfig);
    for (const cohort of cohorts) {
      // Create new CohortDownload
      const cohortDownload = createCohortDownload(cohort);

      // For each public stage data, add to CohortDownload
      const publicStageData = (
        await firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('cohorts')
          .doc(cohort.id)
          .collection('publicStageData')
          .get()
      ).docs.map((doc) => doc.data() as StagePublicData);
      for (const data of publicStageData) {
        cohortDownload.dataMap[data.id] = data;
        // If chat stage, add list of chat messages to CohortDownload
        if (data.kind === StageKind.CHAT) {
          const chatList = (
            await firestore
              .collection('experiments')
              .doc(experimentId)
              .collection('cohorts')
              .doc(cohort.id)
              .collection('publicStageData')
              .doc(data.id)
              .collection('chats')
              .orderBy('timestamp', 'asc')
              .get()
          ).docs.map((doc) => doc.data() as ChatMessage);
          cohortDownload.chatMap[data.id] = chatList;
        }
      }

      // Add CohortDownload to ExperimentDownload
      experimentDownload.cohortMap[cohort.id] = cohortDownload;
    }

    // Add alerts to ExperimentDownload
    const alertList = (
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('alerts')
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as AlertMessage);

    // Group alerts by participant private ID
    for (const alert of alertList) {
      const participantId = alert.participantId;
      if (!experimentDownload.alerts[participantId]) {
        experimentDownload.alerts[participantId] = [];
      }
      experimentDownload.alerts[participantId].push(alert);
    }
  }

  // Convert all Timestamp objects to UnifiedTimestamp format
  const normalized = convertTimestamps(
    experimentDownload,
  ) as ExperimentDownload;
  return normalized;
}
