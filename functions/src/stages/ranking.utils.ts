import {
  ParticipantProfileExtended,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  LRRankingStagePublicData,
  StageKind,
  SurveyStagePublicData,
  filterRankingsByCandidates,
  getCondorcetElectionWinner,
  getRankingCandidatesFromWTL,
  LAS_WTL_STAGE_ID,
} from '@deliberation-lab/utils';

import {runLeaderLottery} from './leadership_rejection.utils';
import {
  getCorrectLASAnswer,
  getCorrectSDAnswer,
} from '../../../frontend/src/shared/templates/leader_rejection_template';
import {
  LeaderSelectionInput,
  LeaderSelectionResult,
} from './leadership_rejection.utils';

import {app} from '../app';

/** Update ranking stage public data to include participant private data. */
export async function addParticipantAnswerToRankingStagePublicData(
  experimentId: string,
  stage: RankingStageConfig,
  participant: ParticipantProfileExtended,
  answer: RankingStageParticipantAnswer,
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

    // For hardcoded WTL stage in LAS game only
    const wtlDoc = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(LAS_WTL_STAGE_ID);
    // Update public stage data (current participant rankings, current winner)
    const publicStageData = (
      await publicDocument.get()
    ).data() as LRRankingStagePublicData;
    publicStageData.participantAnswerMap[participant.publicId] =
      answer.rankingList;

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

    // -----------------------------------------
    // 🧩 CONDITIONAL: Leadership Rejection logic
    // -----------------------------------------
    if (stage.id.startsWith('r1_') || stage.id.startsWith('r2_')) {
      console.log(`[LR] Running leader lottery for stage ${stage.id}`);

      const cohortParticipantsSnap = await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .where('currentCohortId', '==', participant.currentCohortId)
        .get();

      // helper functions

      /**
       * Compute participant performance across baseline1 (LAS) and baseline2 (SD).
       * Returns the number of correct answers summed across both tasks.
       */
      async function getPerformanceScore(pPublicId: string): Promise<number> {
        let totalCorrect = 0;

        // Define the two baseline stages
        const baselineStages = [
          {id: 'baseline1', type: 'LAS'},
          {id: 'baseline2', type: 'SD'},
        ];

        for (const {id: baselineId, type} of baselineStages) {
          const stageRef = app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('participants')
            .doc(pPublicId)
            .collection('stageData')
            .doc(baselineId);

          const docSnap = await stageRef.get();
          if (!docSnap.exists) continue;

          const data = docSnap.data() || {};
          const answers = data.answers || data.surveyAnswers || [];

          for (const q of answers) {
            // questionId looks like "las-water-oil" or "sd-knife-salt"
            const qid = q.questionId ?? q.id;
            const answerId = q.answerId ?? q.selected ?? q.answer;

            if (!qid || !answerId) continue;

            const parts = qid.split('-');
            if (parts.length < 3) continue; // ensure valid pair question

            const id1 = parts[1];
            const id2 = parts[2];

            let correctAnswer = '';
            if (type === 'LAS') {
              correctAnswer = getCorrectLASAnswer(id1, id2);
            } else if (type === 'SD') {
              correctAnswer = getCorrectSDAnswer(id1, id2);
            }

            if (answerId === correctAnswer) totalCorrect += 1;
          }
        }

        return totalCorrect;
      }

      async function didApplyThisRound(
        pPublicId: string,
        roundApplyStageId: string,
      ): Promise<boolean> {
        const stageRef = app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .doc(pPublicId)
          .collection('stageData')
          .doc(roundApplyStageId);

        const docSnap = await stageRef.get();
        if (!docSnap.exists) return false;

        const data = docSnap.data() || {};
        const answers = data.answers || data.surveyAnswers || [];

        for (const q of answers) {
          const qid = q.questionId ?? q.id;
          const answerId = q.answerId ?? q.selected ?? q.answer;
          if (
            (qid === 'apply_r1' || qid === 'apply_r2') &&
            answerId === 'yes'
          ) {
            return true;
          }
        }

        return false;
      }

      const roundStageId = stage.id.includes('r1_') ? 'r1_apply' : 'r2_apply';

      const leaderInputs: LeaderSelectionInput[] = [];
      for (const doc of cohortParticipantsSnap.docs) {
        const pData = doc.data() as ParticipantProfileExtended;
        leaderInputs.push({
          publicId: pData.publicId,
          performanceScore: await getPerformanceScore(pData.publicId),
          applied: await didApplyThisRound(pData.publicId, roundStageId),
        });
      }

      const lotteryResult: LeaderSelectionResult =
        runLeaderLottery(leaderInputs);

      publicStageData.winnerId = lotteryResult.winnerId;
      publicStageData.leaderStatusMap = lotteryResult.participantStatusMap;
      publicStageData.debugLeaderSelection = lotteryResult.debug;

      console.log(`[LR] Winner selected: ${lotteryResult.winnerId}`);
    } else {
      // Default Condorcet (e.g. LAS)
      publicStageData.winnerId =
        getCondorcetElectionWinner(participantAnswerMap);
    }
    transaction.set(publicDocument, publicStageData);
  });
}
