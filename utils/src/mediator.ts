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
  publicId: string; // public ID
  currentStatus: MediatorStatus;
  currentCohortId: string;
  // Maps from stage ID to if the mediator is present in that stage
  activeStageMap: Record<string, boolean>;
}

export interface MediatorProfileExtended extends MediatorProfile {
  privateId: string;
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
): MediatorProfileExtended {
  const activeStageMap: Record<string, boolean> = {};
  activeStageIds.forEach((stageId) => {
    activeStageMap[stageId] = true;
  });

  // TODO: Set public ID appropriately
  const id = generateId();

  return {
    type: UserType.MEDIATOR,
    publicId: id.substring(0, 8),
    privateId: id,
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
