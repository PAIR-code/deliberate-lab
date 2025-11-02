import {ParticipantProfileExtended} from '../participant';
import {SurveyStageConfig, SurveyStageParticipantAnswer} from './survey_stage';
import {
  getSurveyAnswersText,
  getSurveySummaryText,
} from './survey_stage.prompts';
import {StageConfig, StageContextData, StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class SurveyStageHandler implements StageHandler<SurveyStageConfig> {
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

  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
