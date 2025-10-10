import {
  AgentChatPromptConfig,
  AgentPersonaType,
  MediatorProfile,
  createMediatorProfileFromAgentPersona,
} from '@deliberation-lab/utils';
import {getAgentMediatorPersonas} from './utils/firestore';

import {app} from './app';

/** Create mediators for all agent personas with isDefaultAddToCohort true. */
export async function createMediatorsForCohort(
  experimentId: string,
  cohortId: string,
): Promise<MediatorProfile[]> {
  const personas = await getAgentMediatorPersonas(experimentId);
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
          .collection('agentMediators')
          .doc(persona.id)
          .collection('prompts')
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

/** Return all mediators for given cohort and stage. */
export async function getMediatorsInCohortStage(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<MediatorProfile[]> {
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
