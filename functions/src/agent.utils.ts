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
  numRetries: number = 0,
): Promise<{response: ModelResponse; logId: string}> {
  let response = {status: ModelResponseStatus.NONE};
  let lastError: Error | undefined;
  const maxRetries = numRetries;
  const initialDelay = 1000; // 1 second initial delay
  let logId = '';

  // Convert prompt to string for logging (reused across retries)
  const promptForLog = formatPromptForLog(prompt);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
      const queryTimestamp = Timestamp.now();
      response = (await getAgentResponse(
        apiKeyConfig,
        prompt,
        modelSettings,
        generationConfig,
        structuredOutputConfig,
      )) as ModelResponse;
      const responseTimestamp = Timestamp.now();

      log.response = response;
      log.queryTimestamp = queryTimestamp;
      log.responseTimestamp = responseTimestamp;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(error);

      // Log the error response
      log.response = {
        status: ModelResponseStatus.UNKNOWN_ERROR,
        errorMessage: lastError.message,
      };
      log.queryTimestamp = Timestamp.now();
      log.responseTimestamp = Timestamp.now();
    }

    // Write log entry for every attempt
    writeModelLogEntry(experimentId, log);

    // Check if we should retry
    const shouldRetry =
      attempt < maxRetries &&
      (response.status === ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR ||
        response.status === ModelResponseStatus.INTERNAL_ERROR ||
        response.status === ModelResponseStatus.UNKNOWN_ERROR);

    if (shouldRetry) {
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        `API error (${response.status}), retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      // Success or non-retryable error, exit loop
      break;
    }
  }

  // If we exhausted all retries with an error, log it
  if (lastError && response.status === ModelResponseStatus.NONE) {
    console.error(`Failed after ${numRetries} retries:`, lastError);
  }

  return {response, logId};
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
