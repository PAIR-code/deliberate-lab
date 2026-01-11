import {
  ParticipantProfileExtended,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  SurveyStageConfig,
} from '@deliberation-lab/utils';

import {app} from '../app';

/** Update survey stage public data to include participant private data. */
export async function addParticipantAnswerToSurveyStagePublicData(
  experimentId: string,
  stage: SurveyStageConfig,
  participant: ParticipantProfileExtended,
  answer: SurveyStageParticipantAnswer,
) {
  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    // Update public stage data (current participant rankings, current winner)
    const publicDoc = await transaction.get(publicDocument);
    const publicStageData = publicDoc.data() as
      | SurveyStagePublicData
      | undefined;

    if (!publicStageData) {
      console.warn(
        `Public stage data not found for stage ${stage.id} in cohort ${participant.currentCohortId}. This should have been initialized on cohort creation.`,
      );
      return;
    }

    publicStageData.participantAnswerMap[participant.publicId] =
      answer.answerMap;

    // Write public data
    transaction.set(publicDocument, publicStageData);
  });
}
