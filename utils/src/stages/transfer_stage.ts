import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** Transfer stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface TransferStageConfig extends BaseStageConfig {
  kind: StageKind.TRANSFER;
  enableTimeout: boolean;
  timeoutSeconds: number;
  enableSurveyMatching?: boolean; // Whether to enable survey-based participant matching
  surveyStageId?: string; // ID of the survey stage to reference
  surveyQuestionId?: string; // ID of the survey question to reference
  participantCounts?: { [key: string]: number }; // Map of serialized survey answers to required participant counts
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create transfer stage. */
export function createTransferStage(
  config: Partial<TransferStageConfig> = {},
): TransferStageConfig {
  const defaultText =
    'Please wait while we transfer you to the next stage of the experiment. Some latency may occur as we wait for additional participants.';
  return {
    id: config.id ?? generateId(),
    kind: StageKind.TRANSFER,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Transfer',
    descriptions:
      config.descriptions ?? createStageTextConfig({primaryText: defaultText}),
    progress: config.progress ?? createStageProgressConfig(),
    enableTimeout: config.enableTimeout ?? false,
    timeoutSeconds: config.timeoutSeconds ?? 600, // 10 minutes
    enableSurveyMatching: config.enableSurveyMatching ?? false,
    surveyStageId: config.surveyStageId,
    surveyQuestionId: config.surveyQuestionId,
    participantCounts: config.participantCounts,
  };
}
