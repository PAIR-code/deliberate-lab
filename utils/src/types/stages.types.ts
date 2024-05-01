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
//                                             UTILS                                             //
// ********************************************************************************************* //

/** Asserts that the input question is of the given type, and returns it */
export const stageAsKind = <T extends ExpStage>(
  stage: ExpStage | undefined,
  kind: StageKind,
): T => {
  if (stage?.kind !== kind) {
    throw new Error(`Expected stage of kind ${kind}, got ${stage?.kind}`);
  }

  return stage as T;
};

// ********************************************************************************************* //
//                                            CONFIG                                             //
// ********************************************************************************************* //

/** Some stages require all participants to finish before allowing anyone to go on to the next stage */
export const ALLOWED_STAGE_PROGRESSION = {
  [StageKind.AcceptTosAndSetProfile]: false,
  [StageKind.GroupChat]: false,
  [StageKind.VoteForLeader]: true,
  [StageKind.RevealVoted]: false,
  [StageKind.TakeSurvey]: true,
  // [StageKind.RankItems]: false,
} as const;
