import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class TransferStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(): AgentParticipantStageActions {
    return {callApi: false, moveToNextStage: false};
  }
}
