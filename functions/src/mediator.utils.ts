import {
  AgentChatPromptConfig,
  AgentPersonaConfig,
  AgentPersonaType,
  MediatorProfile,
  ProfileAgentConfig,
  createMediatorProfileFromAgentPersona,
} from '@deliberation-lab/utils';
import {getAgentPersonas} from './utils/firestore';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from './app';

/** Create mediators for all agent personas with isDefaultAddToCohort true. */
export async function createMediatorsForCohort(
  experimentId: string,
  cohortId: string,
): MediatorProfile[] {
  const personas = await getAgentPersonas(experimentId);
  const mediators: MediatorProfile[] = [];
  for (const persona of personas) {
    if (
      persona.isDefaultAddToCohort &&
      persona.type === AgentPersonaType.MEDIATOR
    ) {
      const chatPrompts = (
        await app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('agents')
          .doc(persona.id)
          .collection('chatPrompts')
          .get()
      ).docs.map((doc) => doc.data() as ChatPromptConfig);
      const mediator = createMediatorProfileFromAgentPersona(
        cohortId,
        persona,
        chatPrompts.map((prompt) => prompt.id),
      );
      mediators.push(mediator);
    }
  }
  return mediators;
}

/** Return all mediators for given cohort and stage. */
export async function getMediatorsInCohortStage(
  experimentId: string,
  cohortId: string,
  stageId: string,
): MediatorProfile[] {
  return (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('mediators')
      .where('currentCohortId', '==', cohortId)
      .get()
  ).docs
    .map((doc) => doc.data() as MediatorProfile)
    .filter((mediator) => mediator.activeStageMap[stageId]);
}
