/** Types wrappers for the API */

import type { Timestamp } from 'firebase/firestore';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  id: string;
}

/** Type for a onSuccess function callback */
export type OnSuccess<T> = (data: T) => Promise<void> | void;

export type OnError = ((error: Error, variables: string, context: unknown) => unknown) | undefined;

// Helper for Timestamp (make it work between admin & sdk)
// Packages firebase-admin/firestore and firebase/firestore use different Timestamp types
// This type is a workaround to handle both types in the same codebase
// When creating a new Timestamp, use the Timestamp class from the correct package, its type is compatible with this type
export type UnifiedTimestamp = Omit<Timestamp, 'toJSON'>;
