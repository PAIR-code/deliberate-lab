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

async function withRetryTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new RetryTimeoutError()), timeoutMs);
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
): Promise<{
  response: ModelResponse;
  logId: string;
  retryTimedOut: boolean;
}> {
  let response = {status: ModelResponseStatus.NONE};
  let lastError: Error | undefined;
  let retryTimedOut = false;
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
      response = (await (remainingRetryMs === null
        ? request
        : withRetryTimeout(request, remainingRetryMs))) as ModelResponse;
      const responseTimestamp = Timestamp.now();

      log.response = response;
      log.queryTimestamp = queryTimestamp;
      log.responseTimestamp = responseTimestamp;
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
    const shouldRetry =
      !retryTimedOut &&
      (maxRetries === null || attempt < maxRetries) &&
      (response.status === ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR ||
        response.status === ModelResponseStatus.INTERNAL_ERROR ||
        response.status === ModelResponseStatus.UNKNOWN_ERROR);

    if (shouldRetry) {
      const baseDelay = initialDelay * Math.pow(2, attempt);
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
        `API error (${response.status}), retrying after ${delay}ms (attempt ${retryCount})`,
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
