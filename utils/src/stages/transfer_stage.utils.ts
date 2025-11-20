import {ParticipantProfileExtended} from '../participant';
import {
  SurveyStageConfig,
  SurveyStagePublicData,
  SurveyQuestionKind,
} from './survey_stage';
import {SurveyAutoTransferConfig} from './transfer_stage';

/** Sort participants into cohorts based on their multiple choice answer.
 * This is used for SurveyAutoTransfer.
 */
export function groupParticipantsBySurveyAutoTransferConfig(
  availableParticipants: ParticipantProfileExtended[],
  surveyStageConfig: SurveyStageConfig,
  surveyStagePublicData: SurveyStagePublicData,
  autoTransferConfig: SurveyAutoTransferConfig,
): ParticipantProfileExtended[][] {
  // Confirm that stage matches the stage ID in the auto transfer config
  const stageId = autoTransferConfig.surveyStageId;
  const isCorrectStage =
    surveyStageConfig.id === stageId && surveyStagePublicData.id === stageId;
  if (!isCorrectStage) {
    return [];
  }

  // Confirm that survey question is valid, multiple choice, and contains
  // the options specified in the autoTransferConfig
  const questionId = autoTransferConfig.surveyQuestionId;
  const question = surveyStageConfig.questions.find(
    (question) => question.id === questionId,
  );
  if (question?.kind !== SurveyQuestionKind.MULTIPLE_CHOICE) {
    return [];
  }
  const answerIds = Object.keys(autoTransferConfig.participantCounts);
  for (const answerId of answerIds) {
    if (!question.options.find((option) => option.id === answerId)) {
      return [];
    }
  }

  // Iterate over participants in order and attempt to place them in the first
  // available group (based on their survey answer).
  interface SurveyAutoTransferGroup {
    counts: {[key: string]: number};
    participants: ParticipantProfileExtended[];
  }

  const groups: SurveyAutoTransferGroup[] = [];
  for (const participant of availableParticipants) {
    // Confirm that participant has a survey answer that is also
    // specified in the auto transfer config
    const answerMap =
      surveyStagePublicData.participantAnswerMap[participant.publicId] ?? {};
    const answer = answerMap[questionId];
    if (
      answer?.kind !== SurveyQuestionKind.MULTIPLE_CHOICE ||
      !answerIds.find((a) => a === answer?.choiceId)
    ) {
      break;
    }

    // Find the first group where this participant can go, i.e., the first
    // group where the count for the participant's answer has not reached
    // maximum.
    // If no group available, create a new group
    let participantAdded = false;
    for (const group of groups) {
      if (
        (group.counts[answer.choiceId] ?? 0) <
        autoTransferConfig.participantCounts[answer.choiceId]
      ) {
        group.counts[answer.choiceId] =
          (group.counts[answer.choiceId] ?? 0) + 1;
        group.participants.push(participant);
        participantAdded = true;
        break;
      }
    }
    if (!participantAdded) {
      const newGroup = {
        counts: {[answer.choiceId]: 1},
        participants: [participant],
      };
      groups.push(newGroup);
    }
  }

  // Finally, return complete groups of participants only
  const isCompleteGroup = (group: SurveyAutoTransferGroup) => {
    for (const id of answerIds) {
      if (
        (group.counts[id] ?? 0) !== autoTransferConfig.participantCounts[id]
      ) {
        return false;
      }
    }
    return true;
  };
  const completeGroups = groups.filter((group) => isCompleteGroup(group));
  return completeGroups.map((group) => group.participants);
}
