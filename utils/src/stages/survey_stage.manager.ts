import {ParticipantProfileExtended} from '../participant';
import {SurveyStageConfig, SurveyStageParticipantAnswer} from './survey_stage';
import {
  getSurveyAnswersText,
  getSurveySummaryText,
} from './survey_stage.prompts';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class SurveyStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as SurveyStageConfig;

    // If no participants with answers, just return the text
    if (participants.length === 0) {
      return getSurveySummaryText(stage);
    }

    const participantAnswers = stageContext.privateAnswers as {
      participantPublicId: string;
      participantDisplayName: string;
      answer: SurveyStageParticipantAnswer;
    }[];
    return getSurveyAnswersText(participantAnswers, stage.questions, true);
  }
}
