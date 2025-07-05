import {
  AgentChatPromptConfig,
  AgentPersonaConfig,
  ProfileAgentConfig,
} from './agent';
import {UserProfileBase, UserType} from './participant';
import {generateId} from './shared';

/** Mediator types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //
export interface MediatorProfile extends UserProfileBase {
  type: UserType.MEDIATOR;
  id: string; // mediator ID
  currentStatus: MediatorStatus;
  currentCohortId: string;
  // Maps from stage ID to if the mediator is present in that stage
  activeStageMap: Record<string, boolean>;
  // If null, operated by human (otherwise, specifies agent persona, model)
  agentConfig: ProfileAgentConfig | null;
}

export enum MediatorStatus {
  ACTIVE = 'active',
  PAUSED = 'paused', // mediator will not make LLM API calls
  DELETED = 'deleted', // mediator is no longer visible or participating
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //
export function createMediatorProfileFromAgentPersona(
  currentCohortId: string,
  agentPersona: AgentPersonaConfig,
  activeStageIds: string[],
): MediatorProfile {
  const activeStageMap: Record<string, boolean> = {};
  activeStageIds.forEach((stageId) => {
    activeStageMap[stageId] = true;
  });

  return {
    type: UserType.MEDIATOR,
    id: generateId(),
    name: agentPersona.defaultProfile.name,
    avatar: agentPersona.defaultProfile.avatar,
    pronouns: agentPersona.defaultProfile.pronouns,
    currentStatus: MediatorStatus.ACTIVE,
    currentCohortId,
    activeStageMap,
    agentConfig: {
      agentId: agentPersona.id,
      promptContext: '',
      modelSettings: agentPersona.defaultModelSettings,
    },
  };
}
