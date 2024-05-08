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

// ********************************************************************************************* //
//                               COMPLETE AGREGATED TYPE HELPER                                  //
// ********************************************************************************************* //

// For repositories and consumers that will agregate all stage data into one object for convenience of use
interface CompleteParticipantStageBase {
  kind: StageKind; // The stage kind is repeated here at top level so that typescript can use it to discriminate the union type (nested kind is not enough for that)

  config: StageConfig;
  public: PublicStageData | undefined;
  answers: StageAnswer | undefined;
}

export interface CompleteTermsOfServiceStage extends CompleteParticipantStageBase {
  kind: StageKind.TermsOfService;

  config: TermsOfServiceStageConfig;
  public: undefined;
  answers: undefined;
}

export interface CompleteProfileStage extends CompleteParticipantStageBase {
  kind: StageKind.Profile;

  config: ProfileStageConfig;
  public: undefined;
  answers: undefined;
}

export interface CompleteAcceptTosAndSetProfileStage extends CompleteParticipantStageBase {
  kind: StageKind.AcceptTosAndSetProfile;

  config: AcceptTosAndSetProfileStageConfig;
  public: undefined;
  answers: undefined;
}

export interface CompleteSurveyStage extends CompleteParticipantStageBase {
  kind: StageKind.TakeSurvey;

  config: SurveyStageConfig;
  public: undefined;
  answers: SurveyStageAnswer;
}

export interface CompleteGroupChatStage extends CompleteParticipantStageBase {
  kind: StageKind.GroupChat;

  config: GroupChatStageConfig;
  public: GroupChatStagePublicData;
  answers: undefined;
}

export interface CompleteVoteForLeaderStage extends CompleteParticipantStageBase {
  kind: StageKind.VoteForLeader;

  config: VoteForLeaderStageConfig;
  public: VoteForLeaderStagePublicData;
  answers: VoteForLeaderStageAnswer;
}

export interface CompleteRevealVotedStage extends CompleteParticipantStageBase {
  kind: StageKind.RevealVoted;

  config: RevealVotedStageConfig;
  public: undefined;
  answers: undefined;
}

export type CompleteParticipantStage =
  | CompleteTermsOfServiceStage
  | CompleteProfileStage
  | CompleteAcceptTosAndSetProfileStage
  | CompleteSurveyStage
  | CompleteGroupChatStage
  | CompleteVoteForLeaderStage
  | CompleteRevealVotedStage;
