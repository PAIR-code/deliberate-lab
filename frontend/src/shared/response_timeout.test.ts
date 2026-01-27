import {ResponseTimeoutTracker} from './response_timeout';

describe('ResponseTimeoutTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const TIMEOUT_MS = 120_000;

  /** Returns the current fake time as seconds (Firestore timestamp format). */
  function nowSeconds() {
    return Date.now() / 1000;
  }

  function createTracker(onTimedOut = jest.fn()) {
    return {
      tracker: new ResponseTimeoutTracker(TIMEOUT_MS, onTimedOut),
      onTimedOut,
    };
  }

  it('starts not timed out', () => {
    const {tracker} = createTracker();
    expect(tracker.timedOut).toBe(false);
  });

  it('does not time out before the timeout elapses', () => {
    const {tracker} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    jest.advanceTimersByTime(TIMEOUT_MS - 1);
    expect(tracker.timedOut).toBe(false);
  });

  it('times out after the timeout elapses', () => {
    const {tracker, onTimedOut} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(true);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
  });

  it('clears timeout when a response is received', () => {
    const {tracker, onTimedOut} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    // Response arrives before timeout.
    tracker.update('response-1', false, nowSeconds());
    expect(tracker.timedOut).toBe(false);

    // Timeout elapses — should not fire.
    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(false);
    expect(onTimedOut).not.toHaveBeenCalled();
  });

  it('resets when a new participant message is sent after timeout', () => {
    const {tracker, onTimedOut} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    // First timeout fires.
    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(true);
    expect(onTimedOut).toHaveBeenCalledTimes(1);

    // Participant sends a new message.
    tracker.update('msg-2', true, nowSeconds());
    expect(tracker.timedOut).toBe(false);

    // New timeout starts fresh.
    jest.advanceTimersByTime(TIMEOUT_MS - 1);
    expect(tracker.timedOut).toBe(false);

    jest.advanceTimersByTime(1);
    expect(tracker.timedOut).toBe(true);
    expect(onTimedOut).toHaveBeenCalledTimes(2);
  });

  it('does not restart timer for the same message ID', () => {
    const {tracker} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    jest.advanceTimersByTime(TIMEOUT_MS / 2);

    // Same message ID again (e.g., component re-render).
    tracker.update('msg-1', true, nowSeconds());

    // Original timer still fires at the original time.
    jest.advanceTimersByTime(TIMEOUT_MS / 2);
    expect(tracker.timedOut).toBe(true);
  });

  it('clear resets all state', () => {
    const {tracker, onTimedOut} = createTracker();
    tracker.update('msg-1', true, nowSeconds());
    tracker.clear();

    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(false);
    expect(onTimedOut).not.toHaveBeenCalled();
  });

  it('handles response after timeout followed by new message', () => {
    const {tracker} = createTracker();
    tracker.update('msg-1', true, nowSeconds());

    // Timeout fires.
    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(true);

    // Late response arrives.
    tracker.update('response-1', false, nowSeconds());
    expect(tracker.timedOut).toBe(false);

    // New message starts fresh timeout.
    tracker.update('msg-2', true, nowSeconds());
    expect(tracker.timedOut).toBe(false);

    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(true);
  });

  it('handles null last message ID', () => {
    const {tracker, onTimedOut} = createTracker();

    // No messages — should not start timer.
    tracker.update(null, false, null);
    jest.advanceTimersByTime(TIMEOUT_MS);
    expect(tracker.timedOut).toBe(false);
    expect(onTimedOut).not.toHaveBeenCalled();
  });

  it('times out immediately after page refresh if timeout already elapsed', () => {
    const {tracker, onTimedOut} = createTracker();

    // Simulate a message sent 3 minutes ago (past the 2-minute timeout).
    const threeMinutesAgo = nowSeconds() - 180;
    tracker.update('msg-1', true, threeMinutesAgo);

    expect(tracker.timedOut).toBe(true);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
  });

  it('uses remaining time after page refresh if timeout not yet elapsed', () => {
    const {tracker, onTimedOut} = createTracker();

    // Simulate a message sent 30 seconds ago (90 seconds remaining).
    const thirtySecondsAgo = nowSeconds() - 30;
    tracker.update('msg-1', true, thirtySecondsAgo);

    expect(tracker.timedOut).toBe(false);

    // Should not fire after 89 seconds.
    jest.advanceTimersByTime(89_000);
    expect(tracker.timedOut).toBe(false);

    // Should fire after 90 seconds total.
    jest.advanceTimersByTime(1_000);
    expect(tracker.timedOut).toBe(true);
    expect(onTimedOut).toHaveBeenCalledTimes(1);
  });
});
