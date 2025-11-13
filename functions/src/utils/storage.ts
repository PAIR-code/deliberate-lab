import {app} from '../app';
import {v4 as uuidv4} from 'uuid';

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
  const BUCKET_NAME = 'msgraham-deliberate-labs';
  const bucket = app.storage().bucket(BUCKET_NAME);
  const fileName = `${prefix}/${uuidv4()}.${mimeType.split('/')[1]}`;
  const file = bucket.file(fileName);

  const buffer = Buffer.from(base64Data, 'base64');

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
    public: true, // Make the file publicly accessible
  });

  return file.publicUrl();
}
