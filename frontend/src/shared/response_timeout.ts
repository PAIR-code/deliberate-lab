/**
 * Tracks whether we're waiting for a response to a participant's message,
 * with a timeout failsafe that stops waiting if no response arrives.
 *
 * This prevents participants from being stuck with a spinner forever
 * if the backend fails silently (e.g., OOM, timeout).
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
   */
  update(lastMessageId: string | null, lastMessageIsFromParticipant: boolean) {
    if (
      lastMessageIsFromParticipant &&
      lastMessageId !== this.waitingForMessageId
    ) {
      // New participant message — reset and start a fresh timeout.
      this.clear();
      this.waitingForMessageId = lastMessageId;
      this.responseTimeoutId = setTimeout(() => {
        this.responseTimeoutId = null;
        this._timedOut = true;
        this.onTimedOut();
      }, this.timeoutMs);
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
