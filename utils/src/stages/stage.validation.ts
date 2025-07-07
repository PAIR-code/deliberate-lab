import {Type} from '@sinclair/typebox';
import {ChatStageConfigData} from './chat_stage.validation';
import {ChipStageConfigData} from './chip_stage.validation';
import {ComprehensionStageConfigData} from './comprehension_stage.validation';
import {FlipCardStageConfigData} from './flipcard_stage.validation';
import {RankingStageConfigData} from './ranking_stage.validation';
import {InfoStageConfigData} from './info_stage.validation';
import {PayoutStageConfigData} from './payout_stage.validation';
import {PrivateChatStageConfigData} from './private_chat_stage.validation';
import {ProfileStageConfigData} from './profile_stage.validation';
import {RevealStageConfigData} from './reveal_stage.validation';
import {SalespersonStageConfigData} from './salesperson_stage.validation';
import {StockInfoStageConfigData} from './stockinfo_stage.validation';
import {
  SurveyPerParticipantStageConfigData,
  SurveyStageConfigData,
} from './survey_stage.validation';
import {TransferStageConfigData} from './transfer_stage.validation';
import {TOSStageConfigData} from './tos_stage.validation';

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** StageConfig input validation. */
export const StageConfigData = Type.Union([
  ChatStageConfigData,
  ChipStageConfigData,
  ComprehensionStageConfigData,
  FlipCardStageConfigData,
  InfoStageConfigData,
  PayoutStageConfigData,
  PrivateChatStageConfigData,
  ProfileStageConfigData,
  RankingStageConfigData,
  RevealStageConfigData,
  SalespersonStageConfigData,
  StockInfoStageConfigData,
  SurveyPerParticipantStageConfigData,
  SurveyStageConfigData,
  TOSStageConfigData,
  TransferStageConfigData,
]);

/** StageTextConfig input validation. */
export const StageTextConfigSchema = Type.Object({
  primaryText: Type.String(),
  infoText: Type.String(),
  helpText: Type.String(),
});

/** StageProgressConfig input validation. */
export const StageProgressConfigSchema = Type.Object({
  minParticipants: Type.Number(),
  waitForAllParticipants: Type.Boolean(),
  showParticipantProgress: Type.Boolean(),
});
