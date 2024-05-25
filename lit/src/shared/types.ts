/**
 * Generic wrapper type for constructors, used in the DI system.
 */
// tslint:disable-next-line:interface-over-type-literal
export type Constructor<T> = {
  // tslint:disable-next-line:no-any
  new (...args: any[]): T;
};

/** Role. */
export enum Role {
  EXPERIMENTER = "experimenter",
  PARTICIPANT = "participant",
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
