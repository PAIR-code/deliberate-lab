/** Stages types & default definitions */

import { ChatConfig, PublicChatData } from './chats.types';
import { MediatorConfig } from './mediator.types';
import { PayoutBundle, PayoutCurrency, ScoringBundle } from './payout.types';
import { QuestionAnswer, QuestionConfig } from './questions.types';
import { LostAtSeaQuestion, LostAtSeaQuestionAnswer } from './lost_at_sea.types';
import { Votes } from './votes.types';

export enum StageKind {
  Info = 'info',
  TermsOfService = 'termsOfService',
  SetProfile = 'setProfile',
  GroupChat = 'groupChat',
  VoteForLeader = 'voteForLeader',
  Payout = 'payout',
  Reveal = 'reveal',
  TakeSurvey = 'survey',
  LostAtSeaSurvey = 'lostAtSeaSurvey',
}

// ********************************************************************************************* //
//                                           CONFIGS                                             //
// ********************************************************************************************* //

export interface BaseStageConfig {
  id: string;
  kind: StageKind;
  name: string;
  composite?: boolean; // true if stage uses data from other stages (e.g., reveal)
  game?: string; // ID of game, if part of one
  description?: string;
  popupText?: string;
}

export interface InfoStageConfig extends BaseStageConfig {
  kind: StageKind.Info;
  infoLines: string[];
}

export interface TermsOfServiceStageConfig extends BaseStageConfig {
  kind: StageKind.TermsOfService;
  tosLines: string[];
}

export interface ProfileStageConfig extends BaseStageConfig {
  kind: StageKind.SetProfile;
}

export interface SurveyStageConfig extends BaseStageConfig {
  kind: StageKind.TakeSurvey;
  questions: QuestionConfig[];
}

export interface LostAtSeaSurveyStageConfig extends BaseStageConfig {
  kind: StageKind.LostAtSeaSurvey;
  questions: LostAtSeaQuestion[];
}

export interface GroupChatStageConfig extends BaseStageConfig {
  kind: StageKind.GroupChat;
  chatId: string; // TODO: remove field as no longer used
  chatConfig: ChatConfig;
  mediators: MediatorConfig[];
}

export interface VoteForLeaderStageConfig extends BaseStageConfig {
  kind: StageKind.VoteForLeader;
}

export interface PayoutStageConfig extends BaseStageConfig {
  kind: StageKind.Payout;
  composite: true;
  currency: PayoutCurrency;
  payouts: PayoutBundle[];
  scoring?: ScoringBundle[]; // automatically defined during experiment creation
}

export interface RevealStageConfig extends BaseStageConfig {
  kind: StageKind.Reveal;
  composite: true;
  stagesToReveal: string[]; // Names of stages to reveal results for
}

export type StageConfig =
  | InfoStageConfig
  | TermsOfServiceStageConfig
  | ProfileStageConfig
  | SurveyStageConfig
  | LostAtSeaSurveyStageConfig
  | GroupChatStageConfig
  | VoteForLeaderStageConfig
  | PayoutStageConfig
  | RevealStageConfig;

// ********************************************************************************************* //
//                                           ANSWERS                                             //
// ********************************************************************************************* //

interface BaseStageAnswer {
  kind: StageKind;
}

export interface SurveyStageAnswer extends BaseStageAnswer {
  kind: StageKind.TakeSurvey;

  // For convenience, we store answers in a `question id` -> `answer` record
  answers: Record<number, QuestionAnswer>;
}

export interface LostAtSeaSurveyStageAnswer extends BaseStageAnswer {
  kind: StageKind.LostAtSeaSurvey;

  // For convenience, we store answers in a `question id` -> `answer` record
  answers: Record<number, LostAtSeaQuestionAnswer>;
}

export interface VoteForLeaderStageAnswer extends BaseStageAnswer {
  kind: StageKind.VoteForLeader;

  votes: Votes;
}

export interface ChatStageAnswer {
  kind: StageKind.GroupChat;
  readyToEndChat: boolean;
}

// NOTE: profile & TOS stages do not have "answers", as the results are stored directly in the participant profile.
// NOTE: answer documents are lazily created in firestore. They may not exist before the participant submits their answers for the first time.
export type StageAnswer = LostAtSeaSurveyStageAnswer | SurveyStageAnswer | VoteForLeaderStageAnswer | ChatStageAnswer;

// ********************************************************************************************* //
//                                        PUBLIC DATA                                            //
// ********************************************************************************************* //

interface BasePublicStageData {
  kind: StageKind;
}

export interface GroupChatStagePublicData extends BasePublicStageData {
  kind: StageKind.GroupChat;

  numberOfParticipants: number; // Repeat this here for convenience
  readyToEndChat: Record<string, boolean>; // Participant public id => ready to end chat
  chatData: PublicChatData;
}

export interface VoteForLeaderStagePublicData extends BasePublicStageData {
  kind: StageKind.VoteForLeader;

  participantvotes: Record<string, Votes>; // Participant public id => votes of this participant
  currentLeader: string | null; // Updated automatically after each vote
}

export interface SurveyStagePublicData extends BasePublicStageData {
  kind: StageKind.TakeSurvey;
  participantAnswers: Record<string, Record<number, QuestionAnswer>>; // Participant public id => survey answer
}

export interface LostAtSeaSurveyStagePublicData extends BasePublicStageData {
  kind: StageKind.LostAtSeaSurvey;
  participantAnswers: Record<string, Record<number, LostAtSeaQuestionAnswer>>;
}

// NOTE: some stages do not have public stage data
export type PublicStageData =
  GroupChatStagePublicData
  | VoteForLeaderStagePublicData
  | SurveyStagePublicData
  | LostAtSeaSurveyStagePublicData;