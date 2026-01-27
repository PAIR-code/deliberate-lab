/**
 * Tracks whether we're waiting for a response to a participant's message,
 * with a timeout failsafe that stops waiting if no response arrives.
 *
 * This prevents participants from being stuck with a spinner forever
 * if the backend fails silently (e.g., OOM, timeout).
 *
 * The timeout is based on the message's Firestore timestamp, so it
 * survives page refreshes.
 */
export class ResponseTimeoutTracker {
  private responseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private waitingForMessageId: string | null = null;
  private _timedOut = false;
  private onTimedOut: () => void;

  constructor(
    private readonly timeoutMs: number,
    onTimedOut: () => void,
  ) {
    this.onTimedOut = onTimedOut;
  }

  get timedOut() {
    return this._timedOut;
  }

  /**
   * Call when the chat message list updates. Manages timeout state based on
   * whether the last message is from the participant.
   *
   * @param lastMessageId - ID of the last chat message
   * @param lastMessageIsFromParticipant - whether the last message is from the participant
   * @param lastMessageTimestamp - timestamp (in seconds) of the last message
   */
  update(
    lastMessageId: string | null,
    lastMessageIsFromParticipant: boolean,
    lastMessageTimestamp: number | null,
  ) {
    if (lastMessageIsFromParticipant && lastMessageTimestamp !== null) {
      const elapsed = Date.now() - lastMessageTimestamp * 1000;

      if (elapsed >= this.timeoutMs) {
        // Already timed out (e.g., after a page refresh).
        if (!this._timedOut) {
          this._timedOut = true;
          this.waitingForMessageId = lastMessageId;
          this.onTimedOut();
        }
        return;
      }

      if (lastMessageId !== this.waitingForMessageId) {
        // New participant message — start a timeout for the remaining time.
        this.clear();
        this.waitingForMessageId = lastMessageId;
        const remaining = this.timeoutMs - elapsed;
        this.responseTimeoutId = setTimeout(() => {
          this.responseTimeoutId = null;
          this._timedOut = true;
          this.onTimedOut();
        }, remaining);
      }
    } else if (!lastMessageIsFromParticipant) {
      // Response received — clear everything.
      this.clear();
    }
  }

  /** Clear timeout and reset all state. */
  clear() {
    if (this.responseTimeoutId) {
      clearTimeout(this.responseTimeoutId);
      this.responseTimeoutId = null;
    }
    this.waitingForMessageId = null;
    this._timedOut = false;
  }
}
