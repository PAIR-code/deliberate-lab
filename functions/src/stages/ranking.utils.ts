import {
  ParticipantProfileExtended,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  StageKind,
  SurveyStagePublicData,
  RankingStagePublicData,
  LRRankingStagePublicData,
  filterRankingsByCandidates,
  getCondorcetElectionWinner,
  getRankingCandidatesFromWTL,
  isLRRankingStagePublicData,
  LAS_WTL_STAGE_ID,
} from '@deliberation-lab/utils';

import {
  runLeaderLottery,
  LeaderSelectionInput,
  LeaderSelectionResult,
} from './leadership_rejection.utils';

import {
  getCorrectLASAnswer,
  getCorrectSDAnswer,
} from '../../../frontend/src/shared/templates/leader_rejection_template';

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

    // Fetch public stage data
    const publicStageData = (await publicDocument.get()).data() as
      | RankingStagePublicData
      | LRRankingStagePublicData;

    console.log(
      '[LR] addParticipantAnswerToRankingStagePublicData: publicStageData=',
      publicStageData,
    );

    // 🧩 Leadership Rejection logic
    if (isLRRankingStagePublicData(publicStageData)) {
      if (stage.id === 'r1_instructions' || stage.id === 'r2_instructions') {
        console.log(`[LR] Triggering leader lottery at ${stage.id}`);

        // Determine which apply stage to check

        const applyStageId = stage.id.startsWith('r1_')
          ? 'r1_apply'
          : 'r2_apply';

        const cohortParticipantsSnap = await app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .where('currentCohortId', '==', participant.currentCohortId)
          .get();

        // --- Helper functions -----------------------------------------------------
        async function getPerformanceScore(pPublicId: string): Promise<number> {
          let totalCorrect = 0;
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
              const qid = q.questionId ?? q.id;
              const answerId = q.answerId ?? q.selected ?? q.answer;
              if (!qid || !answerId) continue;

              const parts = qid.split('-');
              if (parts.length < 3) continue;

              const id1 = parts[1];
              const id2 = parts[2];
              let correctAnswer = '';

              if (type === 'LAS') correctAnswer = getCorrectLASAnswer(id1, id2);
              else if (type === 'SD')
                correctAnswer = getCorrectSDAnswer(id1, id2);

              if (answerId === correctAnswer) totalCorrect++;
            }
          }

          return totalCorrect;
        }

        async function didApplyThisRound(pPublicId: string): Promise<boolean> {
          const stageRef = app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('participants')
            .doc(pPublicId)
            .collection('stageData')
            .doc(applyStageId);

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

        // --- Compute inputs and run lottery --------------------------------------
        const leaderInputs: LeaderSelectionInput[] = [];
        for (const doc of cohortParticipantsSnap.docs) {
          const pData = doc.data() as ParticipantProfileExtended;
          leaderInputs.push({
            publicId: pData.publicId,
            performanceScore: await getPerformanceScore(pData.publicId),
            applied: await didApplyThisRound(pData.publicId),
          });
        }

        const lotteryResult: LeaderSelectionResult =
          runLeaderLottery(leaderInputs);

        publicStageData.winnerId = lotteryResult.winnerId;
        publicStageData.leaderStatusMap = lotteryResult.participantStatusMap;
        // publicStageData.debugLeaderSelection = lotteryResult.debug;

        console.log(
          `[LR] 🎲 Winner selected at ${stage.id}: ${lotteryResult.winnerId}`,
        );
      }
    } else {
      // -----------------------------------------
      // 🧩 Default Condorcet (e.g. LAS)
      // -----------------------------------------

      // Do NOT re-declare publicStageData
      publicStageData.participantAnswerMap[participant.publicId] =
        answer.rankingList;

      const wtlDoc = app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('cohorts')
        .doc(participant.currentCohortId)
        .collection('publicStageData')
        .doc(LAS_WTL_STAGE_ID);

      let participantAnswerMap = publicStageData.participantAnswerMap;

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

      publicStageData.winnerId =
        getCondorcetElectionWinner(participantAnswerMap);
    }

    transaction.set(publicDocument, publicStageData);
  });
}
