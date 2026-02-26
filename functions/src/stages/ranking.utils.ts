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
  getApplicationsFromLRApplyStage,
  isLRRankingStagePublicData,
  LAS_WTL_STAGE_ID,
  // NEW imports from utils
  getBaselineScoresFromStage,
  //getCorrectLASAnswer_mini,
  //getCorrectSDAnswer_mini,
} from '@deliberation-lab/utils';

import {
  runLeaderLottery,
  LeaderSelectionInput,
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

    // Fetch public stage data
    const publicStageData = (await publicDocument.get()).data() as
      | RankingStagePublicData
      | LRRankingStagePublicData;

    console.debug(
      '[LR] addParticipantAnswerToRankingStagePublicData: publicStageData=',
      publicStageData,
    );

    // ─────────────────────────────────────────────────────────────
    // 🧩 Leadership Rejection logic (LR template)
    // ─────────────────────────────────────────────────────────────
    if (isLRRankingStagePublicData(publicStageData)) {
      // We only trigger the leader lottery when reaching the special
      // ranking "instruction" stages for each round.
      //if (stage.id === 'r1_instructions' || stage.id === 'r2_instructions') {
      if (
        (stage.id === 'r1_instructions' || stage.id === 'r2_instructions') &&
        Object.keys(publicStageData.participantAnswerMap || {}).length === 0 &&
        !publicStageData.winnerId // ensure lottery not run yet
      ) {
        console.debug(`[LR] Triggering leader lottery at ${stage.id}`);

        // Determine which "apply" stage we are in (Round 1 or Round 2)
        const applyStageId = stage.id.startsWith('r1_')
          ? 'r1_apply'
          : 'r2_apply';

        // -------------------------------------------------------------------
        // 1. Read applications from the cohort's publicStageData for applyStageId
        //    (this is analogous to how WTL is handled in the LAS template)
        // -------------------------------------------------------------------
        const applyDoc = await app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('cohorts')
          .doc(participant.currentCohortId)
          .collection('publicStageData')
          .doc(applyStageId)
          .get();

        let applications: Record<string, boolean> = {};

        if (applyDoc.exists) {
          const applyData = applyDoc.data() as SurveyStagePublicData;
          console.debug(
            `[LR] Found applyStage public data for ${applyStageId}:`,
            JSON.stringify(applyData),
          );

          if (applyData.kind === StageKind.SURVEY) {
            applications = getApplicationsFromLRApplyStage(applyData);
            console.debug(
              '[LR] Applications map from apply stage:',
              applications,
            );
          } else {
            console.debug(
              `[LR] applyStageId=${applyStageId} has kind=${applyData.kind}, expected SURVEY`,
            );
          }
        } else {
          console.debug(
            `[LR] No applyStage public data found for ${applyStageId}. All applied=false.`,
          );
        }

        // -------------------------------------------------------------------
        // 2. Fetch all participants in this cohort
        // -------------------------------------------------------------------
        const cohortParticipantsSnap = await app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .where('currentCohortId', '==', participant.currentCohortId)
          .get();

        // -------------------------------------------------------------------
        // 3. Helper: compute performance score (baseline1 + baseline2 correct)
        // ****
        // -------------------------------------------------------------------
        async function getPerformanceScore(pPublicId: string): Promise<number> {
          let totalCorrect = 0;

          // Load baseline1 publicStageData (LAS)
          const baseline1Doc = await app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('cohorts')
            .doc(participant.currentCohortId)
            .collection('publicStageData')
            .doc('baseline1')
            .get();

          if (baseline1Doc.exists) {
            const baseline1Data = baseline1Doc.data() as SurveyStagePublicData;
            const scores1 = getBaselineScoresFromStage(baseline1Data, 'LAS');
            totalCorrect += scores1[pPublicId] ?? 0;
          }

          // Load baseline2 publicStageData (SD)
          const baseline2Doc = await app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('cohorts')
            .doc(participant.currentCohortId)
            .collection('publicStageData')
            .doc('baseline2')
            .get();

          if (baseline2Doc.exists) {
            const baseline2Data = baseline2Doc.data() as SurveyStagePublicData;
            const scores2 = getBaselineScoresFromStage(baseline2Data, 'SD');
            totalCorrect += scores2[pPublicId] ?? 0;
          }

          return totalCorrect;
        }

        // -------------------------------------------------------------------
        // 4. Build lottery inputs: one entry per participant in cohort
        // -------------------------------------------------------------------
        const leaderInputs: LeaderSelectionInput[] = [];

        for (const doc of cohortParticipantsSnap.docs) {
          const pData = doc.data() as ParticipantProfileExtended;
          const pId = pData.publicId;

          const applied = !!applications[pId];
          const performanceScore = await getPerformanceScore(pId);

          leaderInputs.push({
            publicId: pId,
            performanceScore,
            applied,
          });
        }

        console.debug('[LR] Inputs passed into lottery:');
        for (const inp of leaderInputs) {
          console.debug(
            `[LR][input] publicId=${inp.publicId} applied=${inp.applied} score=${inp.performanceScore}`,
          );
        }

        // -------------------------------------------------------------------
        // 5. Run lottery and store results in LRRankingStagePublicData
        // -------------------------------------------------------------------
        const lotteryResult = runLeaderLottery(leaderInputs);

        publicStageData.winnerId = lotteryResult.winnerId;
        publicStageData.leaderStatusMap = lotteryResult.participantStatusMap;

        console.debug(
          `[LR] Winner selected at ${stage.id}: ${lotteryResult.winnerId}`,
        );
      }

      // Note: In LR, we do NOT use Condorcet rankings here
    } else {
      // ─────────────────────────────────────────────────────────────
      // 🧩 Default Condorcet logic (e.g. Lost at Sea template)
      // ─────────────────────────────────────────────────────────────

      // Store participant's ranking answer
      publicStageData.participantAnswerMap[participant.publicId] =
        answer.rankingList;

      // LAS-style: filter candidate set using WTL survey stage
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

      // Compute Condorcet winner among remaining candidates
      publicStageData.winnerId =
        getCondorcetElectionWinner(participantAnswerMap);
    }

    // Finally, write back updated public stage data
    transaction.set(publicDocument, publicStageData);
  });
}
