import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Info stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface InfoStageConfig extends BaseStageConfig {
  kind: StageKind.INFO;
  infoLines: string[];
  youtubeVideoId?: string;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

const TUTORIAL_NAME = 'ℹ️ Platform Tutorial';
const TUTORIAL_INFO_LINES = [
  'Today, you will complete a task in a series of stages.',
  'Here are some parts of the interface that you may find useful.',
  '![Interface tutorial](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/tutorial.png)',
];

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create info stage. */
export function createInfoStage(
  config: Partial<InfoStageConfig> = {},
): InfoStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.INFO,
    name: config.name ?? 'Info',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    infoLines: config.infoLines ?? [],
    youtubeVideoId: config.youtubeVideoId,
  };
}

export function createTutorialInfoStage(
  config: Partial<InfoStageConfig> = {},
  isTutorial: boolean = false,
): InfoStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.INFO,
    name: config.name ?? TUTORIAL_NAME,
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    infoLines: config.infoLines ?? TUTORIAL_INFO_LINES,
    youtubeVideoId: config.youtubeVideoId,
  };
}
