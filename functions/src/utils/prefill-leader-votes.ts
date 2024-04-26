/** Prefill with not-rated votes the leader votes for all participants.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prefillLeaderVotes = (stages: Record<string, any>, participantUids: string[]) => {
  const defaultVotes: Record<string, string> = {};
  participantUids.forEach((uid) => {
    defaultVotes[uid] = 'not-rated';
  });

  Object.keys(stages).forEach((uuid) => {
    if (stages[uuid].kind === 'voteForLeader') {
      stages[uuid].config = { votes: defaultVotes };
    }
  });
};
