import {Type} from '@sinclair/typebox';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.schemas';
import {
  AssetAllocationStageConfigData,
  MultiAssetAllocationStageConfigData,
} from './asset_allocation_stage.validation';
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
import {RoleStageConfigData} from './role_stage.validation';
import {SalespersonStageConfigData} from './salesperson_stage.validation';
import {StockInfoStageConfigData} from './stockinfo_stage.validation';
import {
  SurveyPerParticipantStageConfigData,
  SurveyStageConfigData,
} from './survey_stage.validation';
import {TransferStageConfigData} from './transfer_stage.validation';
import {TOSStageConfigData} from './tos_stage.validation';

// Re-export the schemas for convenience
export {StageTextConfigSchema, StageProgressConfigSchema};

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** Map of stage kinds to their validators */
export const CONFIG_DATA = {
  assetAllocation: AssetAllocationStageConfigData,
  multiAssetAllocation: MultiAssetAllocationStageConfigData,
  chat: ChatStageConfigData,
  chip: ChipStageConfigData,
  comprehension: ComprehensionStageConfigData,
  flipcard: FlipCardStageConfigData,
  info: InfoStageConfigData,
  payout: PayoutStageConfigData,
  privateChat: PrivateChatStageConfigData,
  profile: ProfileStageConfigData,
  ranking: RankingStageConfigData,
  reveal: RevealStageConfigData,
  role: RoleStageConfigData,
  salesperson: SalespersonStageConfigData,
  stockinfo: StockInfoStageConfigData,
  surveyPerParticipant: SurveyPerParticipantStageConfigData,
  survey: SurveyStageConfigData,
  tos: TOSStageConfigData,
  transfer: TransferStageConfigData,
};

/** StageConfig input validation (union of all stage types) */
export const StageConfigData = Type.Union(Object.values(CONFIG_DATA));
