import {
  ParticipantProfileExtended,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
} from '@deliberation-lab/utils';
import {addParticipantAnswerToSurveyStagePublicData} from './survey.utils';
import {getFirestoreParticipant, getFirestoreStage} from '../utils/firestore';

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

    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (stage.kind !== StageKind.SURVEY) return;

    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );

    addParticipantAnswerToSurveyStagePublicData(
      event.params.experimentId,
      stage,
      participant,
      data,
    );
  },
);
