/**
 * Tracks whether we're waiting for a response to a participant's message,
 * with a timeout failsafe that stops waiting if no response arrives.
 *
 * This prevents participants from being stuck with a spinner forever
 * if the backend fails silently (e.g., OOM, timeout).
 *
 * The timeout is based on the message's sent time, so it survives
 * page refreshes. All time values are in seconds.
 */
export class ResponseTimeoutTracker {
  private responseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private waitingForMessageId: string | null = null;
  private _timedOut = false;
  private onTimedOut: () => void;

  constructor(
    private readonly timeoutSeconds: number,
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
   * @param sentAtSeconds - when the last message was sent, in seconds since epoch
   */
  update(
    lastMessageId: string | null,
    lastMessageIsFromParticipant: boolean,
    sentAtSeconds: number | null,
  ) {
    if (lastMessageIsFromParticipant && sentAtSeconds !== null) {
      const elapsedSeconds = Date.now() / 1000 - sentAtSeconds;

      if (elapsedSeconds >= this.timeoutSeconds) {
        // Already timed out (e.g., after a page refresh).
        if (!this._timedOut) {
          this._timedOut = true;
          this.waitingForMessageId = lastMessageId;
          queueMicrotask(this.onTimedOut);
        }
        return;
      }

      if (lastMessageId !== this.waitingForMessageId) {
        // New participant message — start a timeout for the remaining time.
        this.clear();
        this.waitingForMessageId = lastMessageId;
        const remainingMs = (this.timeoutSeconds - elapsedSeconds) * 1000;
        this.responseTimeoutId = setTimeout(() => {
          this.responseTimeoutId = null;
          this._timedOut = true;
          queueMicrotask(this.onTimedOut);
        }, remainingMs);
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
