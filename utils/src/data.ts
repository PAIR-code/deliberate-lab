import {
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  AgentMediatorPersonaConfig,
  AgentParticipantPersonaConfig,
} from './agent';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from './structured_prompt';
import {AlertMessage} from './alert';
import {CohortConfig} from './cohort';
import {Experiment} from './experiment';
import {ParticipantProfileExtended} from './participant';
import {ChatMessage} from './chat_message';
import {
  StageConfig,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
} from './stages/stage';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';

/** Experiment data download types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface ExperimentDownload {
  // Experiment config
  experiment: Experiment;
  // Maps from stage ID to stage config
  stageMap: Record<string, StageConfig>;
  // TODO: Add mediator map
  // Maps from participant public ID to participant download
  participantMap: Record<string, ParticipantDownload>;
  // Maps from cohort ID to cohort download
  cohortMap: Record<string, CohortDownload>;
  // Maps from agent mediator persona ID to agent template
  agentMediatorMap: Record<string, AgentMediatorTemplate>;
  // Maps from agent participant ID to agent template
  agentParticipantMap: Record<string, AgentParticipantTemplate>;
  // List of alerts sent during this experiment
  alerts: AlertMessage[];
}

export interface ParticipantDownload {
  profile: ParticipantProfileExtended;
  // Maps from stage ID to participant's stage answer
  answerMap: Record<string, StageParticipantAnswer>;
}

export interface CohortDownload {
  cohort: CohortConfig;
  // Maps from stage ID to stage public data
  dataMap: Record<string, StagePublicData>;
  // Maps from stage ID to ordered list of chat messages
  chatMap: Record<string, ChatMessage[]>;
}

/** Create experiment download object. */
export function createExperimentDownload(
  experiment: Experiment,
): ExperimentDownload {
  return {
    experiment,
    stageMap: {},
    participantMap: {},
    cohortMap: {},
    agentMediatorMap: {},
    agentParticipantMap: {},
    alerts: [],
  };
}

/** Create participant download object. */
export function createParticipantDownload(
  profile: ParticipantProfileExtended,
): ParticipantDownload {
  return {
    profile,
    answerMap: {},
  };
}

/** Create cohort download object. */
export function createCohortDownload(cohort: CohortConfig): CohortDownload {
  return {
    cohort,
    dataMap: {},
    chatMap: {},
  };
}

/**
 * Build a complete ExperimentDownload structure.
 * Uses Firebase modular SDK functions that work with both client and admin SDKs.
 *
 * @param firestore - Firestore instance (client or admin SDK)
 *                    Note: Uses 'any' type because this function accepts both
 *                    firebase/firestore (client) and firebase-admin/firestore (admin)
 *                    Firestore types, which are incompatible at the type level.
 * @param experimentId - ID of the experiment to download
 * @returns Complete experiment download data
 */
export async function getExperimentDownload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  firestore: any,
  experimentId: string,
) {
  // Get experiment config from experimentId
  const experimentConfig = (
    await getDoc(doc(firestore, 'experiments', experimentId))
  ).data() as Experiment;

  // Create experiment download using experiment config
  const experimentDownload = createExperimentDownload(experimentConfig);

  // For each experiment stage config, add to ExperimentDownload
  const stageConfigs = (
    await getDocs(collection(firestore, 'experiments', experimentId, 'stages'))
  ).docs.map((doc) => doc.data() as StageConfig);
  for (const stage of stageConfigs) {
    experimentDownload.stageMap[stage.id] = stage;
  }

  // For each participant, add ParticipantDownload
  const profiles = (
    await getDocs(
      collection(firestore, 'experiments', experimentId, 'participants'),
    )
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);
  for (const profile of profiles) {
    // Create new ParticipantDownload
    const participantDownload = createParticipantDownload(profile);

    // For each stage answer, add to ParticipantDownload map
    const stageAnswers = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'participants',
          profile.privateId,
          'stageData',
        ),
      )
    ).docs.map((doc) => doc.data() as StageParticipantAnswer);
    for (const stage of stageAnswers) {
      participantDownload.answerMap[stage.id] = stage;
    }
    // Add ParticipantDownload to ExperimentDownload
    experimentDownload.participantMap[profile.publicId] = participantDownload;
  }

  // For each agent mediator, add template
  const agentMediatorCollection = collection(
    firestore,
    'experiments',
    experimentId,
    'agentMediators',
  );
  const mediatorAgents = (await getDocs(agentMediatorCollection)).docs.map(
    (agent) => agent.data() as AgentMediatorPersonaConfig,
  );
  for (const persona of mediatorAgents) {
    const mediatorPrompts = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'agentMediators',
          persona.id,
          'prompts',
        ),
      )
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
  const agentParticipantCollection = collection(
    firestore,
    'experiments',
    experimentId,
    'agentParticipants',
  );
  const participantAgents = (
    await getDocs(agentParticipantCollection)
  ).docs.map((agent) => agent.data() as AgentParticipantPersonaConfig);
  for (const persona of participantAgents) {
    const participantPrompts = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'agentParticipants',
          persona.id,
          'prompts',
        ),
      )
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

  // For each cohort, add CohortDownload
  const cohorts = (
    await getDocs(collection(firestore, 'experiments', experimentId, 'cohorts'))
  ).docs.map((cohort) => cohort.data() as CohortConfig);
  for (const cohort of cohorts) {
    // Create new CohortDownload
    const cohortDownload = createCohortDownload(cohort);

    // For each public stage data, add to CohortDownload
    const publicStageData = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'cohorts',
          cohort.id,
          'publicStageData',
        ),
      )
    ).docs.map((doc) => doc.data() as StagePublicData);
    for (const data of publicStageData) {
      cohortDownload.dataMap[data.id] = data;
      // If chat stage, add list of chat messages to CohortDownload
      if (data.kind === StageKind.CHAT) {
        const chatList = (
          await getDocs(
            query(
              collection(
                firestore,
                'experiments',
                experimentId,
                'cohorts',
                cohort.id,
                'publicStageData',
                data.id,
                'chats',
              ),
              orderBy('timestamp', 'asc'),
            ),
          )
        ).docs.map((doc) => doc.data() as ChatMessage);
        cohortDownload.chatMap[data.id] = chatList;
      }
    }

    // Add CohortDownload to ExperimentDownload
    experimentDownload.cohortMap[cohort.id] = cohortDownload;
  }

  // Add alerts to ExperimentDownload
  const alertList = (
    await getDocs(
      query(
        collection(firestore, 'experiments', experimentId, 'alerts'),
        orderBy('timestamp', 'asc'),
      ),
    )
  ).docs.map((doc) => doc.data() as AlertMessage);
  experimentDownload.alerts = alertList;

  return experimentDownload;
}
