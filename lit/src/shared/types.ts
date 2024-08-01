import { DocumentData, QuerySnapshot } from 'firebase/firestore';
import { ScoringQuestion } from '@llm-mediation-experiments/utils';

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
