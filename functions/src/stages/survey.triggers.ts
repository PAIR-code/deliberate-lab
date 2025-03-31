import {
  ParticipantProfileExtended,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';

import {app} from '../app';

/** Endpoints for updating survey stage public data. */
export const updateSurveyStagePublicData = onDocumentWritten(
  {
    document:
      'experiments/{experimentId}/participants/{participantId}/stageData/{stageId}',
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data.after.data() as StageParticipantAnswer | undefined;

    const stageDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('stages')
      .doc(event.params.stageId);
    const stage = (await stageDocument.get()).data() as StageConfig;
    if (stage.kind !== StageKind.SURVEY) return;

    const participantDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('participants')
      .doc(event.params.participantId);

    // Run document write as transaction to ensure consistency
    await app.firestore().runTransaction(async (transaction) => {
      // Get participant
      const participant = (
        await participantDocument.get()
      ).data() as ParticipantProfileExtended;

      const publicDocument = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(participant.currentCohortId)
        .collection('publicStageData')
        .doc(event.params.stageId);

      // Update public stage data (current participant rankings, current winner)
      const publicStageData = (
        await publicDocument.get()
      ).data() as SurveyStagePublicData;
      publicStageData.participantAnswerMap[participant.publicId] =
        data.answerMap;

      // Write public data
      transaction.set(publicDocument, publicStageData);
    });
  },
);
