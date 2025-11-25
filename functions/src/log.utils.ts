import {
  ModelLogEntry,
  sanitizeRawResponseForLogging,
} from '@deliberation-lab/utils';

import {app} from './app';

/** Write model log for cohort. */
export async function writeModelLogEntry(
  experimentId: string,
  log: ModelLogEntry,
) {
  // Create a copy of the log without the large base64 image data
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
          // Remove base64 data from imageDataList but keep mimeType info
          imageDataList: log.response.imageDataList
            ? log.response.imageDataList.map((img) => ({
                mimeType: img.mimeType,
                data: '[EXCLUDED FROM LOG]',
              }))
            : undefined,
        }
      : log.response,
  };

  const logDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('logs')
    .doc(log.id);

  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(logDoc, sanitizedLog);
  });
}

/** Update model log entry with image URLs after upload. */
export async function updateModelLogImageUrls(
  experimentId: string,
  logId: string,
  imageUrls: string[],
) {
  const logDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('logs')
    .doc(logId);

  await app.firestore().runTransaction(async (transaction) => {
    transaction.update(logDoc, {imageUrls});
  });
}
