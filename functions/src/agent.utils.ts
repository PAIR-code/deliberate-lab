import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  APIKeyConfig,
  ModelGenerationConfig,
  ModelResponse,
  ModelResponseStatus,
  StructuredOutputConfig,
  UserProfile,
  createModelLogEntry,
} from '@deliberation-lab/utils';

import {generateAIResponse, ModelMessage} from './api/ai-sdk.api';
import {formatPromptForLog, writeModelLogEntry} from './log.utils';

class RetryTimeoutError extends Error {
  constructor() {
    super('Retry deadline reached before model response succeeded');
    this.name = 'RetryTimeoutError';
  }
}

/**
 * A single model call exceeded the per-attempt timeout. Unlike
 * RetryTimeoutError (the overall deadline, which gives up), this is
 * retryable, so one hung call is retried within the budget instead of
 * consuming all of it.
 */
// Per-attempt window for a turn-based model call. If a call is still pending
// after this, another is hedged alongside it, bounded by the overall deadline.
const TURN_BASED_PER_ATTEMPT_TIMEOUT_MS = 30000;
// Minimum time between successive turn-based calls, so a rejected call is
// re-issued no sooner than this after the prior one was sent instead of
// immediately. Lets a rate-limited quota recover within the deadline.
const TURN_BASED_MIN_RETRY_INTERVAL_MS = 1000;
// Max times an OK-but-rejected (e.g. empty) response is re-rolled before giving
// up, so a persistently empty response can't loop until the overall deadline.
const MAX_EMPTY_RETRIES = 2;

async function withRetryTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  makeError: () => Error = () => new RetryTimeoutError(),
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(makeError()), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

/** Calls API and writes ModelLogEntry to experiment. */
export async function processModelResponse(
  experimentId: string,
  cohortId: string,
  participantId: string,
  stageId: string,
  userProfile: UserProfile,
  publicId: string,
  privateId: string,
  description: string,
  apiKeyConfig: APIKeyConfig,
  prompt: string | ModelMessage[],
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
  numRetries: number | null = 0,
  maxRetryDurationMs: number | null = null,
  // Optional gate: when provided, an OK response for which this returns false is
  // treated like a (retryable) API failure rather than a usable result. Used in
  // must-respond contexts (e.g. turn-based group chat, where it is always the
  // agent's turn) to reject empty/contentless responses so the agent retries
  // instead of ever emitting an empty message.
  isResponseAcceptable?: (response: ModelResponse) => boolean,
): Promise<{
  response: ModelResponse;
  logId: string;
  retryTimedOut: boolean;
}> {
  let response = {status: ModelResponseStatus.NONE};
  let lastError: Error | undefined;
  let retryTimedOut = false;
  let emptyRetries = 0;
  const maxRetries = numRetries;
  const initialDelay = 1000; // 1 second initial delay
  let logId = '';
  const retryStartMs = Date.now();

  // Convert prompt to string for logging (reused across retries)
  const promptForLog = formatPromptForLog(prompt);

  // Turn-based path: hedge instead of abandoning a slow call. When the
  // per-attempt window elapses without an acceptable response, start another
  // request but keep the earlier ones in flight, and take whichever returns an
  // acceptable response first. Cuts the occasional long tail where one call is
  // merely slow. Bounded by the overall retry deadline.
  if (maxRetries === null) {
    interface Hedge {
      logId: string;
      settled: boolean;
      consumed: boolean;
      response?: ModelResponse;
      promise: Promise<void>;
    }
    const hedges: Hedge[] = [];
    let lastLogId = '';
    let lastResponse: ModelResponse = {status: ModelResponseStatus.NONE};
    // When the most recent call was sent, to space out re-issued calls.
    let lastHedgeSentMs = 0;

    const startHedge = () => {
      const index = hedges.length;
      const log = createModelLogEntry({
        experimentId,
        cohortId,
        participantId,
        stageId,
        userProfile,
        publicId,
        privateId,
        description:
          index > 0 ? `${description} (hedge ${index})` : description,
        prompt: promptForLog,
        createdTimestamp: Timestamp.now(),
      });
      lastLogId = log.id;
      const queryTimestamp = Timestamp.now();
      lastHedgeSentMs = Date.now();
      const hedge: Hedge = {
        logId: log.id,
        settled: false,
        consumed: false,
      } as Hedge;
      hedge.promise = (async () => {
        try {
          const response = (await getAgentResponse(
            apiKeyConfig,
            prompt,
            modelSettings,
            generationConfig,
            structuredOutputConfig,
          )) as ModelResponse;
          log.response = response;
          log.queryTimestamp = queryTimestamp;
          log.responseTimestamp = Timestamp.now();
          hedge.response = response;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.log(err);
          log.response = {
            status: ModelResponseStatus.UNKNOWN_ERROR,
            errorMessage: err.message,
          };
          log.queryTimestamp = queryTimestamp;
          log.responseTimestamp = Timestamp.now();
          hedge.response = {
            status: ModelResponseStatus.UNKNOWN_ERROR,
            errorMessage: err.message,
          };
        } finally {
          writeModelLogEntry(experimentId, log);
          hedge.settled = true;
        }
      })();
      hedges.push(hedge);
    };

    const isAcceptable = (r: ModelResponse) =>
      r.status === ModelResponseStatus.OK &&
      (!isResponseAcceptable || isResponseAcceptable(r));
    // Deterministic, non-retryable statuses (e.g. bad key, invalid config):
    // hedging cannot help, so return immediately.
    const isRetryable = (r: ModelResponse) =>
      r.status === ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR ||
      r.status === ModelResponseStatus.INTERNAL_ERROR ||
      r.status === ModelResponseStatus.UNKNOWN_ERROR ||
      r.status === ModelResponseStatus.REFUSAL_ERROR ||
      r.status === ModelResponseStatus.LENGTH_ERROR ||
      r.status === ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR ||
      r.status === ModelResponseStatus.QUOTA_ERROR;

    startHedge();
    for (;;) {
      const remaining =
        maxRetryDurationMs === null
          ? TURN_BASED_PER_ATTEMPT_TIMEOUT_MS
          : maxRetryDurationMs - (Date.now() - retryStartMs);
      if (remaining <= 0) {
        return {response: lastResponse, logId: lastLogId, retryTimedOut: true};
      }
      const windowMs = Math.min(remaining, TURN_BASED_PER_ATTEMPT_TIMEOUT_MS);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const windowElapsed = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, windowMs);
      });
      const pending = hedges.filter((h) => !h.settled).map((h) => h.promise);
      await Promise.race(
        pending.length
          ? [Promise.race(pending), windowElapsed]
          : [windowElapsed],
      );
      if (timer) clearTimeout(timer);

      for (const hedge of hedges) {
        if (hedge.settled && !hedge.consumed) {
          hedge.consumed = true;
          lastResponse = hedge.response as ModelResponse;
          if (isAcceptable(lastResponse) || !isRetryable(lastResponse)) {
            return {
              response: lastResponse,
              logId: hedge.logId,
              retryTimedOut: false,
            };
          }
        }
      }

      const budgetLeft =
        maxRetryDurationMs === null
          ? true
          : maxRetryDurationMs - (Date.now() - retryStartMs) > 0;
      if (budgetLeft) {
        // Hold off until the minimum interval since the last call has passed.
        // A slow call already outlasts this, so only fast failures wait here.
        const sinceLastSent = Date.now() - lastHedgeSentMs;
        if (sinceLastSent < TURN_BASED_MIN_RETRY_INTERVAL_MS) {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              TURN_BASED_MIN_RETRY_INTERVAL_MS - sinceLastSent,
            ),
          );
        }
        startHedge();
      } else if (hedges.every((h) => h.settled)) {
        // Budget exhausted (the deadline was reached while the last call was in
        // flight) with nothing acceptable: report a timeout, like the deadline
        // check above, so the caller posts the timeout message rather than the
        // pop-up meant for unrecoverable errors.
        return {response: lastResponse, logId: lastLogId, retryTimedOut: true};
      }
    }
  }

  for (
    let attempt = 0;
    maxRetries === null || attempt <= maxRetries;
    attempt++
  ) {
    let responseRejected = false;
    // Create a new log entry for each attempt
    const log = createModelLogEntry({
      experimentId,
      cohortId,
      participantId,
      stageId,
      userProfile,
      publicId,
      privateId,
      description:
        attempt > 0 ? `${description} (retry ${attempt})` : description,
      prompt: promptForLog,
      createdTimestamp: Timestamp.now(),
    });

    logId = log.id;

    try {
      const remainingRetryMs =
        maxRetryDurationMs === null
          ? null
          : maxRetryDurationMs - (Date.now() - retryStartMs);
      if (remainingRetryMs !== null && remainingRetryMs <= 0) {
        throw new RetryTimeoutError();
      }

      const queryTimestamp = Timestamp.now();
      const request = getAgentResponse(
        apiKeyConfig,
        prompt,
        modelSettings,
        generationConfig,
        structuredOutputConfig,
      );
      // This loop only runs for fixed-retry (non-turn-based) calls; the
      // turn-based path is hedged above and returns before here. The call is
      // bounded by an overall retry deadline when one was given, otherwise
      // unbounded.
      response = (await (remainingRetryMs === null
        ? request
        : withRetryTimeout(request, remainingRetryMs))) as ModelResponse;
      const responseTimestamp = Timestamp.now();

      log.response = response;
      log.queryTimestamp = queryTimestamp;
      log.responseTimestamp = responseTimestamp;

      // A successful API call can still be unusable (e.g. empty content when
      // the caller requires a real message): treat it like a failure and retry.
      if (
        response.status === ModelResponseStatus.OK &&
        isResponseAcceptable &&
        !isResponseAcceptable(response)
      ) {
        responseRejected = true;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(error);
      retryTimedOut = error instanceof RetryTimeoutError;

      // Log the error response
      log.response = {
        status: retryTimedOut
          ? ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR
          : ModelResponseStatus.UNKNOWN_ERROR,
        errorMessage: lastError.message,
      };
      log.queryTimestamp = Timestamp.now();
      log.responseTimestamp = Timestamp.now();
    }

    // Write log entry for every attempt
    writeModelLogEntry(experimentId, log);

    // Check if we should retry
    // In turn-based mode a give-up stalls the whole turn cycle instead of
    // just skipping one speaker, so also retry errors that can differ on a
    // re-roll (safety refusals, length caps, unparseable output, rate-limited
    // quota) until they succeed or the deadline is reached. A bad key or
    // invalid config is deterministic, so those still fail fast.
    const turnBasedRetryableStatus =
      maxRetries === null &&
      (response.status === ModelResponseStatus.REFUSAL_ERROR ||
        response.status === ModelResponseStatus.LENGTH_ERROR ||
        response.status === ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR ||
        response.status === ModelResponseStatus.QUOTA_ERROR);
    const shouldRetry =
      !retryTimedOut &&
      (maxRetries === null || attempt < maxRetries) &&
      ((responseRejected && emptyRetries < MAX_EMPTY_RETRIES) ||
        response.status === ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR ||
        response.status === ModelResponseStatus.INTERNAL_ERROR ||
        response.status === ModelResponseStatus.UNKNOWN_ERROR ||
        turnBasedRetryableStatus);

    if (shouldRetry) {
      if (responseRejected) emptyRetries++;
      // No inter-attempt delay for turn-based retries.
      const baseDelay =
        maxRetries === null ? 0 : initialDelay * Math.pow(2, attempt);
      // Clamp to remaining budget so the next attempt fires before the deadline.
      const delay =
        maxRetryDurationMs === null
          ? baseDelay
          : Math.max(
              0,
              Math.min(
                baseDelay,
                maxRetryDurationMs - (Date.now() - retryStartMs),
              ),
            );
      const retryCount =
        maxRetries === null ? `${attempt + 1}` : `${attempt + 1}/${maxRetries}`;
      console.log(
        responseRejected
          ? `Empty/unacceptable response, retrying after ${delay}ms (attempt ${retryCount})`
          : `API error (${response.status}), retrying after ${delay}ms (attempt ${retryCount})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      // Success or non-retryable error, exit loop
      break;
    }
  }

  // If we exhausted all retries with an error, log it
  if (lastError && response.status === ModelResponseStatus.NONE) {
    const retryDescription =
      maxRetries === null ? 'unlimited retries' : `${numRetries} retries`;
    console.error(`Failed after ${retryDescription}:`, lastError);
  }

  return {response, logId, retryTimedOut};
}

/**
 * Unified API call using AI SDK.
 * Routes to the appropriate provider based on modelSettings.apiType.
 */
export async function getAgentResponse(
  apiKeyConfig: APIKeyConfig,
  prompt: string | ModelMessage[],
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  const response = await generateAIResponse(
    apiKeyConfig,
    prompt,
    modelSettings,
    generationConfig,
    structuredOutputConfig,
  );

  if (response.status !== ModelResponseStatus.OK) {
    console.error(
      `GetAgentResponse: response error status: ${response.status}; message: ${response.errorMessage}`,
    );
  }

  return response;
}
