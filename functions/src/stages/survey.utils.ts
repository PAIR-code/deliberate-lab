import {
  ParticipantProfileExtended,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  SurveyStageConfig,
  createSurveyStagePublicData,
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
    let publicStageData = publicDoc.data() as SurveyStagePublicData | undefined;

    if (!publicStageData) {
      publicStageData = createSurveyStagePublicData(stage.id);
    }

    publicStageData.participantAnswerMap[participant.publicId] =
      answer.answerMap;

    // Write public data
    transaction.set(publicDocument, publicStageData);
  });
}
