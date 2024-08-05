import { DocumentData, QuerySnapshot } from 'firebase/firestore';
import {
  Experiment,
  Message,
  ParticipantProfileExtended,
  PayoutCurrency,
  PublicStageData,
  ScoringQuestion,
  StageAnswer,
  StageConfig
} from '@llm-mediation-experiments/utils';

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

/**
 * LLM API model response
 */
export interface ModelResponse {
  score?: number;
  text: string;
}

/** Answer item used to calculate payout. */
export interface AnswerItem extends ScoringQuestion {
  leaderPublicId?: string; // leader public ID if used
  userAnswer: string;
}

/** Experiment data. */
export interface ExperimentData {
  experiment: Experiment;
  participants: Record<string, ParticipantProfileExtended>; // private ID to profile
  stages: Record<string, ExperimentDataStage>; // stage ID to stage data
  chats: Record<string, Message[]>; // stage ID to chat history
  payouts: Record<string, PayoutData>; // stage ID to payout data
}

/** Payout data. */
export interface PayoutData {
  currency: PayoutCurrency,
  payouts: Record<string, number>
  payoutBreakdown: Record<string, PayoutBreakdownItem[]>
}

/** Payout breakdown data. */
export interface PayoutBreakdownItem {
  name: string;
  score: number;
}

/** Experiment data stage. */
export interface ExperimentDataStage {
  config: StageConfig;
  publicData: PublicStageData;
  answers: Record<string, StageAnswer>;
}