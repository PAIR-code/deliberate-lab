import {
  AgentChatPromptConfig,
  AgentPersonaConfig,
  MediatorProfile,
  createMediatorProfileFromAgentPersona,
} from '@deliberation-lab/utils';
import {getAgentPersonas} from './agent.utils';

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
    if (persona.isDefaultAddToCohort) {
      const chatPrompts = (
        await app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('agents')
          .doc(persona.id)
          .collection('chatPrompts')
          .get()
      ).docs.map((doc) => doc.data() as AgentChatPromptConfig);
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
