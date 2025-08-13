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

export interface AddBehaviorEventsData {
  experimentId: string;
  /** Participant private ID. */
  participantId: string;
  /** Events to add in a single batch. */
  events: BehaviorEventInput[];
}
