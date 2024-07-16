/** Vote types */

export enum Vote {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
  NotRated = 'not-rated',
}

export type Votes = Record<string, Vote>;

// ********************************************************************************************* //
//                                             UTILS                                             //
// ********************************************************************************************* //

/** Get the value of each vote */
export const voteScore = (vote: Vote): number => {
  switch (vote) {
    case Vote.Positive:
      return 1;
    case Vote.Neutral:
      return 0;
    case Vote.Negative:
      return -1;
    case Vote.NotRated:
      return 0;
  }
};

/** Agregate the votes of all participants */
export const allVoteScores = (allVotes: Record<string, Votes>): Record<string, number> => {
  const scores: Record<string, number> = {};

  Object.values(allVotes).forEach((votes) => {
    Object.entries(votes).forEach(([participantId, vote]) => {
      scores[participantId] = (scores[participantId] || 0) + voteScore(vote);
    });
  });
  return scores;
};

/** Choose the leader based on a record of scores */
export const chooseLeader = (scores: Record<string, number>): string => {
  // Note: if there is a tie, we choose randomly
  return Object.keys(scores).reduce((a, b) => winner(a, b, scores));
};

/** Helper function to compute the winner */
const winner = (a: string, b: string, scores: Record<string, number>) => {
  if (scores[a] > scores[b]) {
    return a;
  } else if (scores[a] < scores[b]) {
    return b;
  }

  // Tie, choose randomly
  return Math.random() > 0.5 ? a : b;
};