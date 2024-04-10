/** Vote types */

export enum Vote {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
  NotRated = 'not-rated',
}

export type Votes = Record<string, Vote>;

export interface VoteReveal {
  pendingVoteStageName: string;
  revealTimestamp: string | null;
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultVotesConfig = (): Votes => {
  return {};
};

export const getDefaultLeaderRevealConfig = (): VoteReveal => {
  return {
    pendingVoteStageName: '',
    revealTimestamp: null,
  };
};
