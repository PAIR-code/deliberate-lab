import {Experiment} from '../experiment';
import {ParticipantProfileExtended} from '../participant';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from '../structured_prompt';
import {GroupChatStageHandler} from './chat_stage.manager';
import {InfoStageHandler} from './info_stage.manager';
import {PrivateChatStageHandler} from './private_chat_stage.manager';
import {RoleStageHandler} from './role_stage.manager';
import {SurveyStageHandler} from './survey_stage.manager';
import {SurveyPerParticipantStageHandler} from './survey_per_participant_stage.manager';
import {
  StageConfig,
  StageContextData,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
} from './stage';
import {StockInfoStageHandler} from './stockinfo_stage.manager';
import {TOSStageHandler} from './tos_stage.manager';

/** Manages stage handlers for different stage types. */
export class StageManager {
  private handlerMap: Map<string, StageHandler<StageConfig>> = new Map();

  constructor() {
    this.handlerMap.set(StageKind.CHAT, new GroupChatStageHandler());
    this.handlerMap.set(StageKind.INFO, new InfoStageHandler());
    this.handlerMap.set(StageKind.PRIVATE_CHAT, new PrivateChatStageHandler());
    this.handlerMap.set(StageKind.ROLE, new RoleStageHandler());
    this.handlerMap.set(StageKind.STOCKINFO, new StockInfoStageHandler());
    this.handlerMap.set(StageKind.SURVEY, new SurveyStageHandler());
    this.handlerMap.set(
      StageKind.SURVEY_PER_PARTICIPANT,
      new SurveyPerParticipantStageHandler(),
    );
    this.handlerMap.set(StageKind.TOS, new TOSStageHandler());
  }

  /** Returns stage "display" (UI content) used in stage context prompt item.
   *
   * If N > 0 participant answers are provided, then the stage display consists
   * of N "completed" (answers inline) stage displays concatenated
   * if answers are relevant to the stage (i.e., no answers for info stage)
   * and public data (if available for that stage).
   */
  getStageDisplayForPrompt(
    stage: StageConfig,
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    return this.handlerMap
      .get(stage.kind)
      ?.getStageDisplayForPrompt(participants, stageContext);
  }

  getDefaultMediatorStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultMediatorStructuredPrompt(stage.id) ?? undefined
    );
  }

  getDefaultParticipantStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultParticipantStructuredPrompt(stage.id) ?? undefined
    );
  }
}

/** Manages actions (e.g., retrieving and editing) for stages.
 * Can be extended to handle a specific stage type.
 */
export interface StageHandler<StageConfig> {
  getDefaultMediatorStructuredPrompt(
    stageId: string,
  ): MediatorPromptConfig | undefined;
  getDefaultParticipantStructuredPrompt(
    stageId: string,
  ): ParticipantPromptConfig | undefined;
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ): string;
}
