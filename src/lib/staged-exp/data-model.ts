/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { uniqueId } from 'lodash';

// -------------------------------------------------------------------------------------
export enum StageKinds {
  acceptTos = 'acceptTos',
  setProfile = 'setProfile',
  acceptTosAndSetProfile = 'acceptTodAndSetProfile',
  groupChat = 'groupChat',
  voteForLeader = 'voteForLeader',
  revealVoted = 'leaderReveal',
  takeSurvey = 'takeSurvey',
}

export interface GenericExpStage<T> {
  kind: StageKinds;
  name: string;
  config: T;
}

// -------------------------------------------------------------------------------------
export interface UserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
}

export interface ExpStageUserProfile extends GenericExpStage<UserProfile> {
  kind: StageKinds.setProfile;
}

export const fakeEmptyProfile: UserProfile = {
  pronouns: 'fake pronouns',
  avatarUrl: 'fake avatar url',
  name: 'fake name',
};

// -------------------------------------------------------------------------------------
export interface Item {
  name: string; // displayed to the users, must be unique
  imageUrl: string; // for the picture
}

export interface ItemPair {
  item1: Item; // Item name
  item2: Item; // Item name
}

export interface ItemRating extends ItemPair {
  choice: 'item1' | 'item2' | null; // null = not yet rated
  confidence: number | null; // 0 = 50/50, 1 = most confident
}

export const getDefaultItemRating = (): ItemRating => {
  return {
    item1: {
      name: '',
      imageUrl: '',
    },
    item2: {
      name: '',
      imageUrl: '',
    },
    choice: null,
    confidence: null,
  };
};

export interface ItemRatings {
  ratings: ItemRating[];
}

// export const STAGE_KIND_RANKED_ITEMS = 'rank-items';

// export interface ExpStageItemRatings extends GenericExpStage<ItemRatings> {
//   kind: typeof STAGE_KIND_RANKED_ITEMS;
// }

// -------------------------------------------------------------------------------------
export interface UserMessage {
  messageType: 'userMessage';
  timestamp: number;
  fromUserId: string;
  fromProfile: UserProfile;
  text: string;
}

export const FAKE_EMPTY_USERID = '';

export const fakeEmptyMessage: UserMessage = {
  messageType: 'userMessage',
  timestamp: 0,
  fromUserId: FAKE_EMPTY_USERID,
  fromProfile: fakeEmptyProfile,
  text: 'fakeMessage',
};

export interface DiscussItemsMessage {
  messageType: 'discussItemsMessage';
  timestamp: number;
  // itemRatingToDiscuss: ItemRating;
  itemPair: ItemPair;
  text: string;
}

export interface MediatorMessage {
  messageType: 'mediatorMessage';
  timestamp: number;
  text: string;
}

export const fakeEmptyMediatorMessage: MediatorMessage = {
  messageType: 'mediatorMessage',
  timestamp: 0,
  text: 'fakeMessage',
};

export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;

export interface ChatAboutItems {
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
  items: Item[];
  readyToEndChat: boolean;
  // TODO(cjqian): This needs to be a per-participant value.
  isSilent: boolean;
}

export const getDefaultChatAboutItemsConfig = (): ChatAboutItems => {
  return {
    ratingsToDiscuss: [],
    messages: [],
    items: [],
    readyToEndChat: false,
    isSilent: true,
  };
};

export interface ExpStageChatAboutItems extends GenericExpStage<ChatAboutItems> {
  kind: StageKinds.groupChat;
}

export const fakeChat: ExpStageChatAboutItems = {
  kind: StageKinds.groupChat,
  name: 'dummy-chat',
  config: {
    ratingsToDiscuss: [],
    messages: [],
    items: [],
    readyToEndChat: false,
    isSilent: true,
  },
};

// -------------------------------------------------------------------------------------
export enum LeaderVote {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  NOT_RATED = 'not-rated',
}
export interface Votes {
  [otherUserId: string]: LeaderVote;
}

export const getDefaultVotesConfig = (): Votes => {
  return {};
};

export interface ExpStageVotes extends GenericExpStage<Votes> {
  kind: StageKinds.voteForLeader;
}

// -------------------------------------------------------------------------------------
export interface TosAndUserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
  tosLines: string[];
  acceptedTosTimestamp: Date | null;
}

export const getDefaultTosAndUserProfileConfig = (): TosAndUserProfile => {
  return {
    pronouns: '',
    avatarUrl: '',
    name: '',
    tosLines: [''],
    acceptedTosTimestamp: null,
  };
};

export interface ExpStageTosAndUserProfile extends GenericExpStage<TosAndUserProfile> {
  kind: StageKinds.acceptTosAndSetProfile;
}

// -------------------------------------------------------------------------------------
export interface AbstractQuestion<K extends string> {
  kind: K;
  id: string;
}

// -------------------------------------------------------------------------------------
export enum SurveyQuestionKind {
  TEXT = 'TextQuestion',
  CHECK = 'CheckQuestion',
  RATING = 'RatingQuestion',
  SCALE = 'ScaleQuestion',
}

export interface TextQuestion {
  kind: SurveyQuestionKind.TEXT;
  id: string;
  questionText: string;
  answerText: string;
}

export interface CheckQuestion {
  kind: SurveyQuestionKind.CHECK;
  id: string;
  questionText: string;
  checkMark: boolean | null;
}

export interface RatingQuestion {
  kind: SurveyQuestionKind.RATING;
  id: string;
  questionText: string;
  rating: ItemRating;
}

export interface ScaleQuestion {
  kind: SurveyQuestionKind.SCALE;
  id: string;
  questionText: string;
  upperBound: string;
  lowerBound: string;
  score: number | null; //  10 point scale.
}

export type QuestionData = TextQuestion | RatingQuestion | ScaleQuestion | CheckQuestion;

export const getDefaultTextQuestion = (): TextQuestion => {
  return {
    kind: SurveyQuestionKind.TEXT,
    id: uniqueId(),
    questionText: '',
    answerText: '',
  };
};

export const getDefaultCheckQuestion = (): CheckQuestion => {
  return {
    kind: SurveyQuestionKind.CHECK,
    id: uniqueId(),
    questionText: '',
    checkMark: null,
  };
};

export const getDefaultItemRatingsQuestion = (): RatingQuestion => {
  return {
    kind: SurveyQuestionKind.RATING,
    id: uniqueId(),
    questionText: '',
    rating: {
      item1: { name: '', imageUrl: '' },
      item2: { name: '', imageUrl: '' },
      choice: null,
      confidence: null,
    },
  };
};

export const getDefaultScaleQuestion = (): ScaleQuestion => {
  return {
    kind: SurveyQuestionKind.SCALE,
    id: uniqueId(),
    questionText: '',
    upperBound: '',
    lowerBound: '',
    score: null,
  };
};

export interface Survey {
  questions: QuestionData[];
}

export const getDefaultSurveyConfig = (): Survey => {
  return {
    questions: [],
  };
};

export interface ExpStageSurvey extends GenericExpStage<Survey> {
  kind: StageKinds.takeSurvey;
}

// -------------------------------------------------------------------------------------
export interface TosAcceptance {
  acceptedTosTimestamp: Date | null;
}

export interface ExpStageTosAcceptance extends GenericExpStage<TosAcceptance> {
  kind: StageKinds.acceptTos;
}

// -------------------------------------------------------------------------------------
export interface VoteReveal {
  pendingVoteStageName: string;
  revealTimestamp: Date | null;
}
export const getDefaultLeaderRevealConfig = (): VoteReveal => {
  return {
    pendingVoteStageName: '',
    revealTimestamp: null,
  };
};

export interface ExpStageVoteReveal extends GenericExpStage<VoteReveal> {
  kind: StageKinds.revealVoted;
}

// -------------------------------------------------------------------------------------
export type ExpDataKinds =
  | TosAcceptance
  | TosAndUserProfile
  | Survey
  | UserProfile
  | Votes
  | ChatAboutItems
  //| ItemRatings
  | VoteReveal;

export type ExpStage =
  | ExpStageTosAcceptance
  | ExpStageTosAndUserProfile
  | ExpStageSurvey
  | ExpStageUserProfile
  | ExpStageVotes
  | ExpStageChatAboutItems
  // | ExpStageItemRatings
  | ExpStageVoteReveal;

// -------------------------------------------------------------------------------------
export interface UserData {
  // immutale properties.
  readonly accessCode: string;
  readonly userId: string;
  // Their appearance.
  profile: UserProfile;
  stageMap: { [stageName: string]: ExpStage };
  allowedStageProgressionMap: { [stageName: string]: boolean };
  completedStageNames: string[]; // current stage is the very last one.
  workingOnStageName: string;
  futureStageNames: string[];
}

// Note: it should be that:
//   type ShouldBeTrue = ExpStage extends GenericExpStage<ExpDataKinds> ? true : false;

// -------------------------------------------------------------------------------------
// Admin editable, some parts of this are written to by certain
// user actions, by a trusted cloud function.
export interface Experiment {
  name: string;
  date: Date;
  numberOfParticipants: number;
  participants: { [userId: string]: UserData };
}
