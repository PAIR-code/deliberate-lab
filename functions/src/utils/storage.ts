import {app} from '../app';
import {generateId} from '@deliberation-lab/utils';

/**
 * Uploads a base64 encoded image to Google Cloud Storage.
 * @param base64Data The base64 encoded image string.
 * @param mimeType The MIME type of the image.
 * @param prefix A prefix for the file name in the bucket.
 * @returns A URL for the uploaded image.
 *   - In production: signed URL valid for 7 days
 *   - In emulator: public URL (emulator can't sign)
 */
export async function uploadBase64ImageToGCS(
  base64Data: string,
  mimeType: string,
  prefix = 'generated-images',
): Promise<string> {
  const BUCKET_NAME = 'deliberate-lab';
  const bucket = app.storage().bucket(BUCKET_NAME);
  const fileName = `${prefix}/${generateId()}.${mimeType.split('/')[1]}`;
  const file = bucket.file(fileName);

  const buffer = Buffer.from(base64Data, 'base64');

  // Check if running in Firebase emulator
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
