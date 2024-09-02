import { Type } from '@sinclair/typebox';
import { StageGame } from './stage';
import { InfoStageConfigData } from './info_stage.validation';
import { ProfileStageConfigData } from './profile_stage.validation';
import { TOSStageConfigData } from './tos_stage.validation';

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** StageConfig input validation. */
export const StageConfigData = Type.Union([
  InfoStageConfigData,
  ProfileStageConfigData,
  TOSStageConfigData,
]);

/** StageGame input validation. */
export const StageGameSchema = Type.Union([
  Type.Literal(StageGame.NONE),
  Type.Literal(StageGame.LAS),
]);

/** StageTextConfig input validation. */
export const StageTextConfigSchema = Type.Object({
  primaryText: Type.String(),
  infoText: Type.String(),
  helpText: Type.String(),
});