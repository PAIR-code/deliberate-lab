import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Role assignment stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface RoleStageConfig extends BaseStageConfig {
  kind: StageKind.ROLE;
  roles: RoleItem[];
}

export interface RoleItem {
  id: string; // unique identifier
  name: string; // name of role
  displayLines: string[]; // markdown content to display to user
  minParticipants: number;
  maxParticipants: number | null; // if null, no limit on participants
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create role stage. */
export function createRoleStage(
  config: Partial<RoleStageConfig> = {},
): RoleStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ROLE,
    name: config.name ?? 'Role assignment',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    roles: config.roles ?? [],
  };
}

/** Create role item. */
export function createRoleItem(config: Partial<RoleItem> = {}): RoleItem {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? '',
    displayLines: config.displayLines ?? [],
    minParticipants: config.minParticipants ?? 0,
    maxParticipants: config.maxParticipants ?? null,
  };
}
