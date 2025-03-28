import {Value} from '@sinclair/typebox/value';
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

    const stageDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('stages')
      .doc(event.params.stageId);
    const stage = (await stageDocument.get()).data() as StageConfig;
    if (stage.kind !== StageKind.RANKING) return;

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

      // For hardcoded WTL stage in LAS game only
      const wtlDoc = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(participant.currentCohortId)
        .collection('publicStageData')
        .doc(LAS_WTL_STAGE_ID);
      // Update public stage data (current participant rankings, current winner)
      const publicStageData = (
        await publicDocument.get()
      ).data() as RankingStagePublicData;
      publicStageData.participantAnswerMap[participant.publicId] =
        data.rankingList;

      // Calculate rankings
      let participantAnswerMap = publicStageData.participantAnswerMap;

      // If experiment has hardcoded WTL stage (for LAS game), use the WTL
      // stage/question IDs to only consider top ranking participants
      const wtlResponse = await wtlDoc.get();
      if (wtlResponse.exists) {
        const wtlData = wtlResponse.data() as SurveyStagePublicData;

        if (wtlData?.kind === StageKind.SURVEY) {
          const candidateList = getRankingCandidatesFromWTL(wtlData);
          participantAnswerMap = filterRankingsByCandidates(
            participantAnswerMap,
            candidateList,
          );
        }
      }

      // Calculate winner (not used in frontend if strategy is none)
      publicStageData.winnerId =
        getCondorcetElectionWinner(participantAnswerMap);

      transaction.set(publicDocument, publicStageData);
    });
  },
);
