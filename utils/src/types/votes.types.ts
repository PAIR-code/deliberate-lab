/** Vote types */

export enum Vote {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative',
  NotRated = 'not-rated',
}

export type Votes = Record<string, Vote>;

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultVotesConfig = (): Votes => {
  return {};
};
