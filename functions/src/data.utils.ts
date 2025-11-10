/**
 * Data utilities for Firebase Admin SDK
 */

import {Timestamp} from 'firebase-admin/firestore';
import {UnifiedTimestamp} from '@deliberation-lab/utils';

/**
 * Converts a Firestore Admin SDK Timestamp to UnifiedTimestamp format.
 * Uses the public seconds/nanoseconds properties instead of the serialized _seconds/_nanoseconds.
 */
export function toUnifiedTimestamp(timestamp: Timestamp): UnifiedTimestamp {
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds,
  };
}

/**
 * Recursively converts all Timestamp objects in the data structure to UnifiedTimestamp format.
 * This is necessary because Admin SDK Timestamps serialize with _seconds/_nanoseconds,
 * but the frontend expects seconds/nanoseconds (without underscores).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check if this is a Timestamp object
  if (obj instanceof Timestamp) {
    return toUnifiedTimestamp(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => convertTimestamps(item));
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = convertTimestamps(obj[key]);
      }
    }
    return result;
  }

  // Return primitives as-is
  return obj;
}
