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
class AttemptTimeoutError extends Error {
  constructor() {
    super('Model call exceeded per-attempt timeout');
    this.name = 'AttemptTimeoutError';
  }
}

// Per-attempt timeout for turn-based model calls. Sized so roughly six
// attempts fit the overall turn-based deadline while still giving a single
// call enough time to return.
const TURN_BASED_PER_ATTEMPT_TIMEOUT_MS = 30000;
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
      // Turn-based calls cap each attempt (a retryable AttemptTimeoutError)
      // so a single hung call is retried within the overall deadline.
      // Non-turn-based calls are bounded only by an overall retry deadline
      // when one was given (RetryTimeoutError on timeout) and are otherwise
      // uncapped, with no per-attempt timeout.
      if (maxRetries === null) {
        const cap =
          remainingRetryMs === null
            ? TURN_BASED_PER_ATTEMPT_TIMEOUT_MS
            : Math.min(remainingRetryMs, TURN_BASED_PER_ATTEMPT_TIMEOUT_MS);
        response = (await withRetryTimeout(
          request,
          cap,
          () => new AttemptTimeoutError(),
        )) as ModelResponse;
      } else {
        response = (await (remainingRetryMs === null
          ? request
          : withRetryTimeout(request, remainingRetryMs))) as ModelResponse;
      }
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

      // A per-attempt timeout is retryable: reflect a retryable status on
      // `response` (which the retry check below reads) so the agent re-rolls
      // within the overall deadline. A thrown error otherwise leaves `response`
      // as the non-retryable NONE, which would give up after one attempt and
      // stall the turn (it is not a RetryTimeoutError, so the caller will not
      // skip it). On the eventual deadline a RetryTimeoutError ends and
      // skips.
      if (error instanceof AttemptTimeoutError) {
        response = {status: ModelResponseStatus.UNKNOWN_ERROR};
      }
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
