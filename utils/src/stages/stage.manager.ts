import {ParticipantProfileExtended} from '../participant';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';
import {GroupChatStageHandler} from './chat_stage.manager';
import {InfoStageHandler} from './info_stage.manager';
import {PrivateChatStageHandler} from './private_chat_stage.manager';
import {RoleStageHandler} from './role_stage.manager';
import {SurveyStageHandler} from './survey_stage.manager';
import {SurveyPerParticipantStageHandler} from './survey_per_participant_stage.manager';
import {ProfileStageHandler} from './profile_stage.manager';
import {StageConfig, StageContextData, StageKind} from './stage';
import {StockInfoStageHandler} from './stockinfo_stage.manager';
import {TOSStageHandler} from './tos_stage.manager';

/** Manages stage handlers for different stage types. */
export class StageManager {
  private handlerMap: Map<string, BaseStageHandler> = new Map();

  constructor() {
    this.handlerMap.set(StageKind.CHAT, new GroupChatStageHandler());
    this.handlerMap.set(StageKind.INFO, new InfoStageHandler());
    this.handlerMap.set(StageKind.PRIVATE_CHAT, new PrivateChatStageHandler());
    this.handlerMap.set(StageKind.ROLE, new RoleStageHandler());
    this.handlerMap.set(StageKind.STOCKINFO, new StockInfoStageHandler());
    this.handlerMap.set(StageKind.SURVEY, new SurveyStageHandler());
    this.handlerMap.set(StageKind.PROFILE, new ProfileStageHandler());
    this.handlerMap.set(
      StageKind.SURVEY_PER_PARTICIPANT,
      new SurveyPerParticipantStageHandler(),
    );
    this.handlerMap.set(StageKind.TOS, new TOSStageHandler());
  }

  /** Specifies what must be done to complete the given stage
   * as an agent participant.
   */
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getAgentParticipantActionsForStage(participant, stage) ?? {
        callApi: false,
        moveToNextStage: true,
      }
    );
  }

  /** Extracts relevant content from parsed model response to create
   *  a private participant answer (or, for profile stage, update profile).
   */
  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
    response: unknown,
  ) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.extractAgentParticipantAnswerFromResponse(
          participant,
          stage,
          response,
        ) ?? undefined
    );
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
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getStageDisplayForPrompt(participants, stageContext) ?? ''
    );
  }

  getDefaultMediatorStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultMediatorStructuredPrompt(stage) ?? undefined
    );
  }

  getDefaultParticipantStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultParticipantStructuredPrompt(stage) ?? undefined
    );
  }
}
