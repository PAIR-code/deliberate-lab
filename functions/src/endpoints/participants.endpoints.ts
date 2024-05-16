/** Endpoints for interactions with participants */

import {
  QuestionAnswer,
  StageAnswerData,
  StageKind,
  SurveyStageConfig,
} from '@llm-mediation-experiments/utils';
import { Value } from '@sinclair/typebox/value';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';

/** Generic endpoint for stage answering. */
export const updateStage = onCall(async (request) => {
  const { data } = request;

  if (Value.Check(StageAnswerData, data)) {
    const { experimentId, participantId, stageName, stage } = data;

    // Validation
    let error = false;
    switch (stage.kind) {
      case StageKind.VoteForLeader:
        if (participantId in stage.votes) error = true;
        break;
      case StageKind.TakeSurvey:
        error = await validateSurveyAnswers(experimentId, stageName, stage.answers);
        break;
    }

    if (error) throw new functions.https.HttpsError('invalid-argument', 'Invalid answers');

    const answerDoc = app
      .firestore()
      .doc(`experiments/${experimentId}/participants/${participantId}/stages/${stageName}`);

    await answerDoc.set(data, { merge: true });

    return { data: 'success' };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

/** Helper function to validate a survey stage's answers against its related config */
const validateSurveyAnswers = async (
  experimentId: string,
  stageName: string,
  answers: Record<number, QuestionAnswer>,
): Promise<boolean> => {
  const configDoc = app.firestore().doc(`experiments/${experimentId}/stages/${stageName}`);
  const data = (await configDoc.get()).data() as SurveyStageConfig | undefined;

  if (!data) return false;

  for (const answer of Object.values(answers)) {
    const config = data.questions[answer.id];
    if (!config || config.kind !== answer.kind) return false;
  }

  return true;
};
