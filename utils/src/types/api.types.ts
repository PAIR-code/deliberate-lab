/** Types wrappers for the API */

import type { Timestamp } from 'firebase/firestore';
import { StageConfig } from './stages.types';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  uid: string;
}

/** Type for a onSuccess function callback */
export type OnSuccess<T> = (data: T) => Promise<void> | void;

export type OnError = ((error: Error, variables: string, context: unknown) => unknown) | undefined;

/** Data to be sent to the backend in order to generate a template */
export interface TemplateCreationData {
  name: string;
  stageMap: Record<string, StageConfig>;
}

export interface ChatToggleUpdate {
  readyToEndChat: boolean;
  participantId: string;
  chatId: string;
}

// Helper for Timestamp (make it work between admin & sdk)
// Packages firebase-admin/firestore and firebase/firestore use different Timestamp types
// This type is a workaround to handle both types in the same codebase
// When creating a new Timestamp, use the Timestamp class from the correct package, its type is compatible with this type
export type UnifiedTimestamp = Omit<Timestamp, 'toJSON'>;
