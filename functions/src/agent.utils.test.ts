import {ModelResponse, ModelResponseStatus} from '@deliberation-lab/utils';

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {now: () => ({seconds: 0, nanoseconds: 0})},
}));
jest.mock('./log.utils', () => ({
  writeModelLogEntry: jest.fn(),
  formatPromptForLog: jest.fn(() => 'prompt'),
}));
jest.mock('./api/ai-sdk.api', () => ({
  generateAIResponse: jest.fn(),
}));

import {processModelResponse} from './agent.utils';
import {generateAIResponse} from './api/ai-sdk.api';

const mockCall = generateAIResponse as jest.Mock;

// Tracks how many mocked calls are in flight at once (concurrency), and resolves
// each call after a scripted delay with a scripted response.
let inFlight = 0;
let maxInFlight = 0;

function script(entries: Array<{delayMs: number; response: ModelResponse}>) {
  let i = 0;
  mockCall.mockImplementation(() => {
    const entry = entries[Math.min(i, entries.length - 1)];
    i++;
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    return new Promise<ModelResponse>((resolve) => {
      setTimeout(() => {
        inFlight--;
        resolve(entry.response);
      }, entry.delayMs);
    });
  });
}

const ok = (text: string): ModelResponse => ({
  status: ModelResponseStatus.OK,
  text,
});
const err = (): ModelResponse => ({
  status: ModelResponseStatus.UNKNOWN_ERROR,
  errorMessage: 'boom',
});

function run(numRetries: number | null, maxRetryDurationMs: number | null) {
  return processModelResponse(
    'exp',
    'cohort',
    'pid',
    'stage',
    {} as never,
    'public',
    'private',
    '',
    {} as never,
    'prompt',
    {} as never,
    {} as never,
    undefined,
    numRetries,
    maxRetryDurationMs,
  );
}

describe('processModelResponse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    inFlight = 0;
    maxInFlight = 0;
    mockCall.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('turn-based (hedged)', () => {
    it('returns a fast response without hedging', async () => {
      script([{delayMs: 5000, response: ok('fast')}]);
      const p = run(null, 120000);
      await jest.advanceTimersByTimeAsync(5000);
      const {response, retryTimedOut} = await p;
      expect(response.text).toBe('fast');
      expect(retryTimedOut).toBe(false);
      expect(mockCall).toHaveBeenCalledTimes(1);
      expect(maxInFlight).toBe(1);
    });

    it('keeps the first call in flight and takes whichever resolves first', async () => {
      // First call resolves at 40s (10s after the 30s window starts the 2nd).
      script([
        {delayMs: 40000, response: ok('first')},
        {delayMs: 40000, response: ok('second')},
      ]);
      const p = run(null, 120000);
      await jest.advanceTimersByTimeAsync(30000); // window elapses -> 2nd starts
      expect(mockCall).toHaveBeenCalledTimes(2);
      expect(maxInFlight).toBe(2); // both in flight (first not abandoned)
      await jest.advanceTimersByTimeAsync(10000); // first resolves at 40s
      const {response, retryTimedOut} = await p;
      expect(response.text).toBe('first');
      expect(retryTimedOut).toBe(false);
    });

    it('times out at the overall deadline when nothing resolves in time', async () => {
      script([{delayMs: 1000000, response: ok('never')}]);
      const p = run(null, 120000);
      await jest.advanceTimersByTimeAsync(120000);
      const {retryTimedOut} = await p;
      expect(retryTimedOut).toBe(true);
    });
  });

  describe('non-turn-based (sequential, unaffected)', () => {
    it('retries sequentially with no overlapping calls', async () => {
      script([
        {delayMs: 1000, response: err()},
        {delayMs: 1000, response: err()},
        {delayMs: 1000, response: ok('done')},
      ]);
      const p = run(2, null);
      // Flush the calls and the exponential inter-attempt backoff.
      for (let i = 0; i < 20; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }
      const {response} = await p;
      expect(response.text).toBe('done');
      expect(mockCall).toHaveBeenCalledTimes(3);
      expect(maxInFlight).toBe(1); // never hedges: at most one call at a time
    });
  });
});
