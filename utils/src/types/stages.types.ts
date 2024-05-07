/** Stages types & default definitions */

import { ChatConfig, PublicChatData } from './chats.types';
import { QuestionAnswer, QuestionConfig } from './questions.types';
import { Votes } from './votes.types';

export enum StageKind {
  TermsOfService = 'termsOfService',
  Profile = 'profile',
  AcceptTosAndSetProfile = 'acceptTosAndSetProfile',
  GroupChat = 'groupChat',
  VoteForLeader = 'voteForLeader',
  RevealVoted = 'leaderReveal',
  TakeSurvey = 'takeSurvey',
  // RankItems = 'rankItems',
}

// ********************************************************************************************* //
//                                           CONFIGS                                             //
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

interface BaseStageConfig {
  kind: StageKind;
}

export interface TermsOfServiceStageConfig extends BaseStageConfig {
  kind: StageKind.TermsOfService;

  tosLines: string[];
}

export interface ProfileStageConfig extends BaseStageConfig {
  kind: StageKind.Profile;
}

export interface AcceptTosAndSetProfileStageConfig extends BaseStageConfig {
  kind: StageKind.AcceptTosAndSetProfile;

  tosLines: string[];
}

export interface SurveyStageConfig extends BaseStageConfig {
  kind: StageKind.TakeSurvey;

  questions: QuestionConfig[];
}

export interface GroupChatStageConfig extends BaseStageConfig {
  kind: StageKind.GroupChat;

  chatId: string;
  chatConfig: ChatConfig;
}

export interface VoteForLeaderStageConfig extends BaseStageConfig {
  kind: StageKind.VoteForLeader;
}

export interface RevealVotedStageConfig extends BaseStageConfig {
  kind: StageKind.RevealVoted;

  pendingVoteStageName: string; // Name of the `VoteForLeader` stage that this stage is revealing the results of
}

export type StageConfig =
  | TermsOfServiceStageConfig
  | ProfileStageConfig
  | AcceptTosAndSetProfileStageConfig
  | SurveyStageConfig
  | GroupChatStageConfig
  | VoteForLeaderStageConfig
  | RevealVotedStageConfig;

// ********************************************************************************************* //
//                                           ANSWERS                                             //
// ********************************************************************************************* //

interface BaseStageAnswer {
  kind: StageKind;
}

export interface SurveyStageAnswer extends BaseStageAnswer {
  kind: StageKind.TakeSurvey;

  answers: QuestionAnswer[];
}

export interface VoteForLeaderStageAnswer extends BaseStageAnswer {
  kind: StageKind.VoteForLeader;

  votes: Votes;
}

export type StageAnswer = SurveyStageAnswer | VoteForLeaderStageAnswer;

// NOTE: profile & TOS stages do not have "answers", as the results are stored directly in the participant profile

// ********************************************************************************************* //
//                                        PUBLIC DATA                                            //
// ********************************************************************************************* //

interface BasePublicStageData {
  kind: StageKind;
}

export interface GroupChatStagePublicData extends BasePublicStageData {
  kind: StageKind.GroupChat;

  readyToEndChat: Record<string, boolean>; // Participant public id => ready to end chat
  chatData: PublicChatData;
}

export interface VoteForLeaderStagePublicData extends BasePublicStageData {
  kind: StageKind.VoteForLeader;

  participantvotes: Record<string, Votes>; // Participant public id => votes of this participant
}

export type PublicStageData = GroupChatStagePublicData | VoteForLeaderStagePublicData;