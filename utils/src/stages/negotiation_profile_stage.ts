import {generateId} from '../shared';
import {
  BaseStageConfig,
  BaseStagePublicData,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** NegotiationProfile stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface NegotiationProfileItem {
  id: string; // unique identifier
  name: string; // name of profile (e.g. 'Party A')
  avatar: string; // avatar emoji (default empty string so hidden)
  displayLines: string[]; // markdown content to display to user when assigned
}

export interface NegotiationProfileStageConfig extends BaseStageConfig {
  kind: StageKind.NEGOTIATION_PROFILE;
  items: NegotiationProfileItem[];
}

/**
 * NegotiationProfileStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface NegotiationProfileStagePublicData extends BaseStagePublicData {
  kind: StageKind.NEGOTIATION_PROFILE;
  // Maps from participant public ID to item ID
  participantMap: Record<string, string>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create negotiation profile stage. */
export function createNegotiationProfileStage(
  config: Partial<NegotiationProfileStageConfig> = {},
): NegotiationProfileStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.NEGOTIATION_PROFILE,
    name: config.name ?? 'Negotiation Profile Assignment',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    items: config.items ?? [
      createNegotiationProfileItem({
        id: 'party-a',
        name: 'Party A',
        avatar: '',
        displayLines: [
          'You have been assigned to **Party A** for the negotiation stage.',
        ],
      }),
      createNegotiationProfileItem({
        id: 'party-b',
        name: 'Party B',
        avatar: '',
        displayLines: [
          'You have been assigned to **Party B** for the negotiation stage.',
        ],
      }),
      createNegotiationProfileItem({
        id: 'party-c',
        name: 'Party C',
        avatar: '',
        displayLines: [
          'You have been assigned to **Party C** for the negotiation stage.',
        ],
      }),
    ],
  };
}

/** Create negotiation profile item. */
export function createNegotiationProfileItem(
  config: Partial<NegotiationProfileItem> = {},
): NegotiationProfileItem {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? '',
    avatar: config.avatar ?? '',
    displayLines: config.displayLines ?? [],
  };
}

/** Create negotiation profile stage public data. */
export function createNegotiationProfileStagePublicData(
  config: NegotiationProfileStageConfig,
): NegotiationProfileStagePublicData {
  return {
    id: config.id,
    kind: StageKind.NEGOTIATION_PROFILE,
    participantMap: {},
  };
}
