// functions/src/stages/leadership.utils.ts

// Adjust the import path depending on where your frontend templates live
// (You only need this if the backend doesn’t already have access to those functions.)

export interface LeaderSelectionInput {
  publicId: string; // participant.publicId
  performanceScore: number; // baseline1_correct + baseline2_correct
  applied: boolean; // did they apply this round?
}

export interface LeaderSelectionResult {
  winnerId: string;
  participantStatusMap: Record<string, string>;
  debug: {
    seed: number;
    roll: number;
    rankedCandidates: string[];
    probabilities: Record<string, number>;
    candidatePoolAppliedOnly: boolean;
  };
}

/**
 * Compute geometric tail weights for candidates ranked by performance.
 * Input: candidates sorted descending by performance.
 */
function computeWeights(candidateIds: string[]): Record<string, number> {
  const k = candidateIds.length;
  if (k === 1) {
    return {[candidateIds[0]]: 1.0};
  }

  // k > 1
  const topId = candidateIds[0];
  const weights: Record<string, number> = {};
  const P1 = 0.6;
  weights[topId] = P1;

  // tail gets 0.40
  const tailMass = 0.4;
  const rho = Math.pow(1 / 3, 1 / (k - 1)); // ρ = (1/3)^(1/(k-1))

  // for rank r = 2..k
  for (let r = 2; r <= k; r++) {
    const id = candidateIds[r - 1];
    //const pr = P1 * (1 - rho) * Math.pow(rho, r-2);
    // careful: we said "spread 0.40", but formula uses tailMass, not P1:
    // your spec says:
    //  - P1 = 0.60
    //  - tail 0.40 distributed geometrically
    // so use tailMass here instead of P1.
    const pr = tailMass * (1 - rho) * Math.pow(rho, r - 2);
    weights[id] = pr;
  }

  // (Optional) small normalize if rounding error bugs you:
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach((id) => {
    weights[id] = weights[id] / sum;
  });

  return weights;
}

/**
 * Draws a winner given a prob distribution.
 * We also allow passing in a seed for reproducibility, but here we just Math.random().
 * You can later replace Math.random() with a seeded PRNG from the experiment ID.
 */
function drawWeightedWinner(weights: Record<string, number>): {
  winnerId: string;
  roll: number;
} {
  const roll = Math.random();
  let acc = 0;
  for (const [id, p] of Object.entries(weights)) {
    acc += p;
    if (roll <= acc) {
      return {winnerId: id, roll};
    }
  }
  // fallback in case of float precision
  const lastId = Object.keys(weights)[Object.keys(weights).length - 1];
  return {winnerId: lastId, roll};
}

/**
 * Main selection logic for one round.
 */

export function runLeaderLottery(
  participants: LeaderSelectionInput[],
): LeaderSelectionResult {
  console.debug('──────────────────────────────────────────────');
  console.debug('[LR][lottery] START Leader Lottery');
  console.debug('[LR][lottery] Raw inputs:');
  for (const p of participants) {
    console.debug(
      `  - ${p.publicId} | applied=${p.applied} | score=${p.performanceScore}`,
    );
  }
  console.debug('──────────────────────────────────────────────');
  // 1. Who applied?
  const applicants = participants.filter((p) => p.applied);

  const hasApplicants = applicants.length > 0;
  console.debug(
    '[LR][lottery] Applicants:',
    applicants.map((a) => a.publicId),
  );
  console.debug('[LR][lottery] hasApplicants =', hasApplicants);

  // 2. Candidate pool
  const candidatePool = hasApplicants ? applicants : participants;
  console.debug(
    '[LR][lottery] Candidate pool:',
    candidatePool.map((p) => p.publicId),
  );

  // 3. Rank candidate pool by performanceScore desc, tiebreak deterministic
  const ranked = [...candidatePool].sort((a, b) => {
    if (b.performanceScore !== a.performanceScore) {
      return b.performanceScore - a.performanceScore;
    }
    // deterministic tie-break: alphabetical on publicId
    return a.publicId.localeCompare(b.publicId);
  });

  const rankedIds = ranked.map((p) => p.publicId);
  console.debug('[LR][lottery] Ranked order (best → worst):', rankedIds);

  // 4. Weights
  const weights = computeWeights(rankedIds);
  console.debug('[LR][lottery] Weights:', weights);

  // 5. Draw winner
  const {winnerId, roll} = drawWeightedWinner(weights);

  // 6. Assign statuses
  const participantStatusMap: Record<string, string> = {};
  if (hasApplicants) {
    // case ≥1 applied:
    // applied & selected → candidate_accepted
    // applied & not → candidate_rejected
    // did not apply → non_candidate (+ hypothetical check)
    console.debug('[LR][lottery] Assigning statuses because applicants > 0');

    const winner = winnerId;

    // first assign accepted/rejected or non_candidate
    for (const p of participants) {
      if (p.applied) {
        participantStatusMap[p.publicId] =
          p.publicId === winner ? 'candidate_accepted' : 'candidate_rejected';
      } else {
        participantStatusMap[p.publicId] = 'non_candidate';
      }
    }

    // hypothetical for each non-candidate:
    for (const p of participants) {
      if (!p.applied) {
        // pretend they had applied too
        const hypoPool = [...applicants, p];

        // rank hypo pool
        const hypoRanked = [...hypoPool].sort((a, b) => {
          if (b.performanceScore !== a.performanceScore) {
            return b.performanceScore - a.performanceScore;
          }
          return a.publicId.localeCompare(b.publicId);
        });

        const hypoIds = hypoRanked.map((x) => x.publicId);
        const hypoWeights = computeWeights(hypoIds);

        // Instead of randomizing again, we replicate same draw roll
        // to make hypo deterministic w.r.t. this round.
        // We'll reuse the SAME `roll` so it's "would you have won THIS draw?"
        let acc = 0;
        let hypoWinner = hypoIds[hypoIds.length - 1];
        for (const id of hypoIds) {
          acc += hypoWeights[id];
          if (roll <= acc) {
            hypoWinner = id;
            break;
          }
        }

        if (hypoWinner === p.publicId) {
          participantStatusMap[p.publicId] = 'non_candidate_hypo_selected';
        } else {
          participantStatusMap[p.publicId] = 'non_candidate_hypo_rejected';
        }
      }
    }
  } else {
    // case 0 applied -> everyone is a "candidate"
    // winner → non_candidate_accepted
    // others → non_candidate_rejected
    console.debug(
      '[LR][lottery] NO applicants → everyone considered non_candidate_*',
    );

    for (const p of participants) {
      participantStatusMap[p.publicId] =
        p.publicId === winnerId
          ? 'non_candidate_accepted'
          : 'non_candidate_rejected';
    }
  }

  return {
    winnerId,
    participantStatusMap,
    debug: {
      seed: 123,
      roll,
      rankedCandidates: rankedIds,
      probabilities: weights,
      candidatePoolAppliedOnly: hasApplicants,
    },
  };
}
