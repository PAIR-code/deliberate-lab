/** Types wrappers for the API */

import type { Timestamp } from 'firebase/firestore';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  id: string;
  group: string;
}

// Helper for Timestamp (make it work between admin & sdk)
// Packages firebase-admin/firestore and firebase/firestore use different Timestamp types
// This type is a workaround to handle both types in the same codebase
// When creating a new Timestamp, use the Timestamp class from the correct package, its type is compatible with this type
export type UnifiedTimestamp = Omit<Timestamp, 'toJSON'>;
