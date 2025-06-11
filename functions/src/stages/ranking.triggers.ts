import {
  ParticipantProfileExtended,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
  filterRankingsByCandidates,
  getCondorcetElectionWinner,
  getRankingCandidatesFromWTL,
  LAS_WTL_STAGE_ID,
  ElectionStrategy,
} from '@deliberation-lab/utils';
import {addParticipantAnswerToRankingStagePublicData} from './ranking.utils';
import {getFirestoreParticipant, getFirestoreStage} from '../utils/firestore';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';

import {app} from '../app';

/** Endpoints for updating ranking stage public data. */
export const updateRankingStagePublicData = onDocumentWritten(
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
    if (stage.kind !== StageKind.RANKING) return;

    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );

    addParticipantAnswerToRankingStagePublicData(
      event.params.experimentId,
      stage,
      participant,
      data,
    );
  },
);
