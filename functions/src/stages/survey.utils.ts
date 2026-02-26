import {
  ParticipantProfileExtended,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
} from '@deliberation-lab/utils';

import {app} from '../app';

/** Update survey stage public data to include participant private data. */
export async function addParticipantAnswerToSurveyStagePublicData(
  experimentId: string,
  stage: SurveyStageConfig,
  participant: ParticipantProfileExtended,
  answer: SurveyStageParticipantAnswer,
) {
  const publicDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(participant.currentCohortId)
    .collection('publicStageData')
    .doc(stage.id);

  // Merge write: only updates this participant's entry without touching
  // other participants' data, so concurrent invocations are safe.
  await publicDocument.set(
    {participantAnswerMap: {[participant.publicId]: answer.answerMap}},
    {merge: true},
  );
}
