/** Behavioral event types for participant interaction logging. */

export interface BehaviorEventInput {
  /** Event type identifier, e.g., 'click', 'keydown'. */
  eventType: string;
  /** High-resolution relative timestamp in milliseconds (e.g., performance.now()). */
  relativeTimestamp: number;
  /** Current stage ID when event was captured. */
  stageId: string;
  /** Arbitrary metadata map; contents depend on eventType. */
  metadata: Record<string, unknown>;
}

// Event shape as stored/exported from Firestore
// Note: backend writes field name `type` in documents.
import type {UnifiedTimestamp} from './shared';
export interface BehaviorEvent {
  type: string;
  relativeTimestamp: number;
  stageId: string;
  metadata: Record<string, unknown>;
  timestamp: UnifiedTimestamp;
}

export interface AddBehaviorEventsData {
  experimentId: string;
  /** Participant private ID. */
  participantId: string;
  /** Events to add in a single batch. */
  events: BehaviorEventInput[];
}
