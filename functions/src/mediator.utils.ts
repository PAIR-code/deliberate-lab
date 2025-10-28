import {
  AgentChatPromptConfig,
  AgentPersonaConfig,
  AgentPersonaType,
  MediatorProfile,
  MediatorProfileExtended,
  createMediatorProfileFromAgentPersona,
} from '@deliberation-lab/utils';
import {getAgentMediatorPersonas} from './utils/firestore';

import {app} from './app';

/** Create mediators for all agent personas with isDefaultAddToCohort true. */
export async function createMediatorsForCohort(
  experimentId: string,
  cohortId: string,
): Promise<MediatorProfileExtended[]> {
  const personas = await getAgentMediatorPersonas(experimentId);
  const mediators: MediatorProfileExtended[] = [];
  for (const persona of personas) {
    if (
      persona.isDefaultAddToCohort &&
      persona.type === AgentPersonaType.MEDIATOR
    ) {
      const mediator = await createMediatorProfileForPersona(
        experimentId,
        cohortId,
        persona,
      );
      mediators.push(mediator);
    }
  }
  return mediators;
}

/** Create mediator profile for specified persona and cohort. */
export async function createMediatorProfileForPersona(
  experimentId: string,
  cohortId: string,
  persona: AgentPersonaConfig,
): Promise<MediatorProfileExtended> {
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

  return createMediatorProfileFromAgentPersona(
    cohortId,
    persona,
    chatPrompts.map((prompt) => prompt.id),
  );
}

/** Create mediator profile for persona ID in specified cohort. */
export async function createMediatorForCohortFromPersona(
  experimentId: string,
  cohortId: string,
  personaId: string,
): Promise<MediatorProfileExtended | null> {
  const personaDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agentMediators')
    .doc(personaId)
    .get();

  if (!personaDoc.exists) {
    return null;
  }

  const persona = personaDoc.data() as AgentPersonaConfig;
  if (persona.type !== AgentPersonaType.MEDIATOR) {
    return null;
  }

  return createMediatorProfileForPersona(experimentId, cohortId, persona);
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
