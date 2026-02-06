import {app} from '../app';
import {generateId, ModelFile, StoredFile} from '@deliberation-lab/utils';

/** Generate storage path for chat message files */
export function getChatMessageStoragePath(
  experimentId: string,
  stageId: string,
  chatMessageId: string,
): string {
  return `experiments/${experimentId}/chats/${stageId}/${chatMessageId}`;
}

/**
 * Uploads a base64 encoded file to Google Cloud Storage.
 * @param base64Data The base64 encoded file string.
 * @param mimeType The MIME type of the file.
 * @param prefix A prefix for the file name in the bucket.
 * @returns A URL for the uploaded file.
 *   - In production: signed URL valid for 7 days
 *   - In emulator: public URL (emulator can't sign)
 */
export async function uploadBase64FileToGCS(
  base64Data: string,
  mimeType: string,
  prefix = 'generated-images',
): Promise<string> {
  const BUCKET_NAME = 'deliberate-lab';
  const bucket = app.storage().bucket(BUCKET_NAME);
  const fileName = `${prefix}/${generateId()}.${mimeType.split('/')[1]}`;
  const file = bucket.file(fileName);

  const buffer = Buffer.from(base64Data, 'base64');

  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  if (isEmulator) {
    // Emulator: save and return public URL (emulator can't sign URLs)
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
      public: true,
    });
    return file.publicUrl();
  } else {
    // Production: save and return signed URL (works regardless of bucket ACL settings)
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return signedUrl;
  }
}

/**
 * Uploads model response files to GCS.
 * @param files Array of files from model response
 * @param basePath Base path for storage (e.g., 'experiments/{id}/chats/{id}')
 * @returns Array of StoredFile objects with URLs and mediaTypes
 */
export async function uploadModelResponseFiles(
  files: ModelFile[],
  basePath: string,
): Promise<StoredFile[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map(async (file, index) => {
    const url = await uploadBase64FileToGCS(
      file.base64,
      file.mediaType,
      `${basePath}/${index}`,
    );
    return {
      mediaType: file.mediaType,
      url,
    };
  });

  return Promise.all(uploadPromises);
}
