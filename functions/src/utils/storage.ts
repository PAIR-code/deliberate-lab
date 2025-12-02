import {app} from '../app';
import {generateId} from '@deliberation-lab/utils';

/**
 * Uploads a base64 encoded image to Google Cloud Storage.
 * @param base64Data The base64 encoded image string.
 * @param mimeType The MIME type of the image.
 * @param prefix A prefix for the file name in the bucket.
 * @returns The public URL of the uploaded image.
 */
export async function uploadBase64ImageToGCS(
  base64Data: string,
  mimeType: string,
  prefix = 'generated-images',
): Promise<string> {
  const BUCKET_NAME = 'deliberate-labs';
  const bucket = app.storage().bucket(BUCKET_NAME);
  const fileName = `${prefix}/${generateId()}.${mimeType.split('/')[1]}`;
  const file = bucket.file(fileName);

  const buffer = Buffer.from(base64Data, 'base64');

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });

  return file.publicUrl();
}
