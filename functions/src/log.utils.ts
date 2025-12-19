import {
  ModelLogEntry,
  sanitizeRawResponseForLogging,
  StoredFile,
} from '@deliberation-lab/utils';

import {ModelMessage} from './api/ai-sdk.api';
import {app} from './app';

/**
 * Formats a prompt for logging in ModelLogEntry.
 */
export function formatPromptForLog(prompt: string | ModelMessage[]): string {
  // String prompts (used for group chats) are already in log-friendly format.
  // Names and timestamps are embedded via convertChatMessageToPromptFormat()
  // in utils/src/stages/chat_stage.prompts.ts, e.g., "(12:34) Alice: Hello"
  if (typeof prompt === 'string') {
    return prompt;
  }

  // ModelMessage[] prompts (used for private 1:1 chats) need formatting.
  // Note: names are not available in ModelMessage - only role and content.
  return prompt
    .map((m) => {
      const content =
        typeof m.content === 'string' ? m.content : '[multimodal content]';
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join('\n');
}

/** Write model log for cohort. */
export async function writeModelLogEntry(
  experimentId: string,
  log: ModelLogEntry,
) {
  // Create a copy of the log without the large base64 file data
  // to avoid Firestore document size limits
  const sanitizedLog = {
    ...log,
    response: log.response
      ? {
          ...log.response,
          // Sanitize rawResponse to remove base64 data and signatures
          rawResponse: log.response.rawResponse
            ? sanitizeRawResponseForLogging(log.response.rawResponse)
            : undefined,
          // Remove base64 data from files but keep mediaType info
          files: log.response.files
            ? log.response.files.map((file) => ({
                mediaType: file.mediaType,
                base64: '[EXCLUDED FROM LOG]',
              }))
            : undefined,
        }
      : log.response,
  };

  const logDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('logs')
    .doc(log.id);

  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(logDoc, sanitizedLog);
  });
}

/** Update model log entry with uploaded files. */
export async function updateModelLogFiles(
  experimentId: string,
  logId: string,
  files: StoredFile[],
) {
  if (!files || files.length === 0) {
    return;
  }

  const logDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('logs')
    .doc(logId);

  await app.firestore().runTransaction(async (transaction) => {
    transaction.update(logDoc, {files});
  });
}
