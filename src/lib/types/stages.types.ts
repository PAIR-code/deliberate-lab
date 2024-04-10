/** Stages types & default definitions */

import { ChatAboutItems } from './chats.types';
import { TosAndUserProfile } from './participants.types';
import { Survey } from './questions.types';
import { VoteReveal, Votes } from './votes.types';

export enum StageKind {
  AcceptTosAndSetProfile = 'acceptTosAndSetProfile',
  GroupChat = 'groupChat',
  VoteForLeader = 'voteForLeader',
  RevealVoted = 'leaderReveal',
  TakeSurvey = 'takeSurvey',
  // RankItems = 'rankItems',
}

export type ExpConfig =
  | TosAndUserProfile
  | Survey
  | TosAndUserProfile
  | Votes
  | ChatAboutItems
  //| ItemRatings
  | VoteReveal;

export interface GenericExpStage {
  kind: StageKind;
  name: string;
  config: ExpConfig;
}

export interface ExpStageChatAboutItems extends GenericExpStage {
  kind: StageKind.GroupChat;
  config: ChatAboutItems;
}

export interface ExpStageVotes extends GenericExpStage {
  kind: StageKind.VoteForLeader;
  config: Votes;
}

export interface ExpStageTosAndUserProfile extends GenericExpStage {
  kind: StageKind.AcceptTosAndSetProfile;
  config: TosAndUserProfile;
}

export interface ExpStageSurvey extends GenericExpStage {
  kind: StageKind.TakeSurvey;
  config: Survey;
}

export interface ExpStageVoteReveal extends GenericExpStage {
  kind: StageKind.RevealVoted;
  config: VoteReveal;
}

// export interface ExpStageItemRatings extends GenericExpStage {
//   kind: StageKind.RankItems;
//   config: ItemRatings;
// }

export type ExpStage =
  | ExpStageTosAndUserProfile
  | ExpStageSurvey
  | ExpStageVotes
  | ExpStageChatAboutItems
  // | ExpStageItemRatings
  | ExpStageVoteReveal;

// ********************************************************************************************* //
//                                            CONFIG                                             //
// ********************************************************************************************* //

const AUTO_PROGRESS_STAGES = [StageKind.TakeSurvey, StageKind.VoteForLeader];

/** NOTE: this is completely useless. We could check stage kinds directly in the frontend instead of generating this. */
export const generateAllowedStageProgressionMap = (stages: ExpStage[]): Record<string, boolean> => {
  const allowedStageProgressionMap: Record<string, boolean> = {};

  stages.forEach(
    (stage) => (allowedStageProgressionMap[stage.name] = AUTO_PROGRESS_STAGES.includes(stage.kind)),
  );

  return allowedStageProgressionMap;
};
