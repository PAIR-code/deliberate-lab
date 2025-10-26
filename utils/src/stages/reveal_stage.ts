import {generateId} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** Reveal stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * RevealStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface RevealStageConfig extends BaseStageConfig {
  kind: StageKind.REVEAL;
  items: RevealItem[]; // ordered list of reveal items
}

/** Base reveal item for all stages. */
export interface BaseRevealItem {
  id: string; // ID of stage to reveal
  kind: StageKind;
  revealAudience: RevealAudience;
}

/** Reveal item. */
export type RevealItem =
  | ChipRevealItem
  | RankingRevealItem
  | SurveyRevealItem
  | MultiAssetAllocationRevealItem;

/** Reveal settings for chip stage. */
export interface ChipRevealItem extends BaseRevealItem {
  kind: StageKind.CHIP;
}

/** Reveal settings for ranking stage. */
export interface RankingRevealItem extends BaseRevealItem {
  kind: StageKind.RANKING;
}

/** Reveal settings for survey stage. */
export interface SurveyRevealItem extends BaseRevealItem {
  kind: StageKind.SURVEY;
  revealScorableOnly: boolean;
}

export interface MultiAssetAllocationRevealItem extends BaseRevealItem {
  kind: StageKind.MULTI_ASSET_ALLOCATION;
  displayMode: 'full' | 'scoreOnly';
}

/** Specifies which answers to reveal. */
export enum RevealAudience {
  CURRENT_PARTICIPANT = 'CURRENT', // Reveals answers for the current participant.
  ALL_PARTICIPANTS = 'ALL', // Reveals answers for all participants.
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create reveal stage. */
export function createRevealStage(
  config: Partial<RevealStageConfig> = {},
): RevealStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.REVEAL,
    name: config.name ?? 'Reveal',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    items: config.items ?? [],
  };
}

/** Create new reveal item. */
export function createNewRevealItem(
  id: string,
  kind: StageKind,
): RevealItem | null {
  switch (kind) {
    case StageKind.CHIP:
      return createChipRevealItem({id});
    case StageKind.RANKING:
      return createRankingRevealItem({id});
    case StageKind.SURVEY:
      return createSurveyRevealItem({id});
    case StageKind.MULTI_ASSET_ALLOCATION:
      return createMultiAssetAllocationRevealItem({id});
    default:
      return null;
  }
}

/** Create chip reveal item. */
export function createChipRevealItem(
  config: Partial<ChipRevealItem> = {},
): ChipRevealItem {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHIP,
    revealAudience: config.revealAudience ?? RevealAudience.ALL_PARTICIPANTS,
  };
}

/** Create ranking reveal item. */
export function createRankingRevealItem(
  config: Partial<RankingRevealItem> = {},
): RankingRevealItem {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.RANKING,
    revealAudience: config.revealAudience ?? RevealAudience.CURRENT_PARTICIPANT,
  };
}

/** Create survey reveal item. */
export function createSurveyRevealItem(
  config: Partial<SurveyRevealItem> = {},
): SurveyRevealItem {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY,
    revealAudience: config.revealAudience ?? RevealAudience.CURRENT_PARTICIPANT,
    revealScorableOnly: config.revealScorableOnly ?? false,
  };
}

export function createMultiAssetAllocationRevealItem(
  config: Partial<MultiAssetAllocationRevealItem> = {},
): MultiAssetAllocationRevealItem {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.MULTI_ASSET_ALLOCATION,
    revealAudience: config.revealAudience ?? RevealAudience.ALL_PARTICIPANTS,
    displayMode: config.displayMode ?? 'full',
  };
}
