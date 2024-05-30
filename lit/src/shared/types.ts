import { DocumentData, QuerySnapshot } from 'firebase/firestore';

/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // tslint:disable-next-line:no-any
  new (...args: any[]): T;
};

/* Snapshot for Firebase calls. */
export type Snapshot = QuerySnapshot<DocumentData, DocumentData>;

/** Current permissions. */
export enum Permission {
  EDIT = "edit",  // Used for experimenters
  PREVIEW = "preview",  // Used for experimenter
  PARTICIPATE = "participate", // Used for participant
}

/** Color modes. */
export enum ColorMode {
  LIGHT = "light",
  DARK = "dark",
  DEFAULT = "default",
}

/** Color themes. */
export enum ColorTheme {
  KAMINO = "kamino",
}

/** Text sizes. */
export enum TextSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

// TODO: Combine temporary types with legacy types

// Legacy types
export enum StageKind {
  Info = 'info',
  TermsOfService = 'termsOfService',
  SetProfile = 'setProfile',
  GroupChat = 'groupChat',
  VoteForLeader = 'voteForLeader',
  RevealVoted = 'leaderReveal',
  TakeSurvey = 'takeSurvey',
  // RankItems = 'rankItems',
}

interface BaseStageConfig {
  kind: StageKind;
  name: string;
}

export interface InfoStageConfig extends BaseStageConfig {
  kind: StageKind.Info;
  infoLines: string[];
}

// TODO: Add other stage config types
export type StageConfig = InfoStageConfig;

// Temporary types
export type ExperimentStage = ChatStage | InfoStage;

export enum StageType {
  CHAT = "chat",
  INFO = "info",
}

export interface Stage<T = StageType> {
  id: string;
  name: string;
  type: T;
}

export interface ChatStage extends Stage<"chat"> {
  profiles: Profile[];
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  author: string;
  content: string;
}

export interface Profile {
  id: string;
  name: string;
  pronouns: string;
  avatar: string;
}

export interface InfoStage extends Stage<"info"> {
  content: string;
  acknowledgment: boolean;
}
