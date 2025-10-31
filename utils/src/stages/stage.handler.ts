import {Experiment} from '../experiment';
import {ExperimenterData} from '../experimenter';
import {ParticipantProfileExtended} from '../participant';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from '../structured_prompt';
import {
  StageConfig,
  StageContextData,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
} from './stage';

/** Specifies what actions should be taken for the agent participant
 * to "complete" the stage.
 */
export interface AgentParticipantStageActions {
  callApi: boolean;
  moveToNextStage: boolean;
}

/** Base implementation of StageHandler (manages actions/editing for stage).
 * Can be extended to handle a specific stage type.
 */
export class BaseStageHandler {
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    // By default, do not change anything and just proceed to next stage
    return {callApi: false, moveToNextStage: true};
  }

  getDefaultMediatorStructuredPrompt(
    stage: StageConfig,
  ): MediatorPromptConfig | undefined {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(
    stage: StageConfig,
  ): ParticipantPromptConfig | undefined {
    return undefined;
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    return '';
  }
}
