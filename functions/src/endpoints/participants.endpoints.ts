/** Endpoints for interactions with participants */

import {
  QuestionAnswer,
  StageAnswerData,
  StageKind,
  SurveyStageConfig,
  lookupTable,
  mergeableRecord,
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

    const answerDoc = app
      .firestore()
      .doc(`experiments/${experimentId}/participants/${participantId}/stages/${stageName}`);

    // Validation & merging answers
    switch (stage.kind) {
      case StageKind.VoteForLeader:
        if (participantId in stage.votes)
          throw new functions.https.HttpsError('invalid-argument', 'Invalid answers');
        await answerDoc.set({ votes: stage.votes }, { merge: true });
        break;

      case StageKind.TakeSurvey:
        await validateSurveyAnswers(experimentId, stageName, stage.answers);

        // Prepare data to merge individual answers into the firestore document
        const data = {
          kind: StageKind.TakeSurvey,
          ...mergeableRecord(stage.answers, 'answers'),
        };
        await answerDoc.set(data, { merge: true });
        break;
    }

    return { data: 'success' };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

/** Helper function to validate a survey stage's answers against its related config */
const validateSurveyAnswers = async (
  experimentId: string,
  stageName: string,
  answers: Record<number, QuestionAnswer>,
) => {
  const configDoc = app.firestore().doc(`experiments/${experimentId}/stages/${stageName}`);
  const data = (await configDoc.get()).data() as SurveyStageConfig | undefined;

  if (!data) throw new functions.https.HttpsError('invalid-argument', 'Invalid answers');

  // Question configs are stored in an array. Make a "id" lookup table for easier access
  const questions = lookupTable(data.questions, 'id');

  for (const answer of Object.values(answers)) {
    const config = questions[answer.id];
    if (!config || config.kind !== answer.kind)
      throw new functions.https.HttpsError('invalid-argument', 'Invalid answers');
  }
};
