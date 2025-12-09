/**
 * Deliberate Lab API Key Management Module
 * Handles generation, hashing, storage, and verification of API keys
 */

import {randomBytes, scrypt, createHash, timingSafeEqual} from 'crypto';
import {promisify} from 'util';
import {
  DeliberateLabAPIKeyPermission,
  DeliberateLabAPIKeyData,
} from '@deliberation-lab/utils';
import {app} from '../app';

const scryptAsync = promisify(scrypt);

/**
 * Extract Deliberate Lab API key from Bearer token in Authorization header
 * @param authHeader - The Authorization header value
 * @returns The extracted API key or null if not found/invalid
 */
export function extractDeliberateLabBearerToken(
  authHeader: string | undefined,
): string | null {
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Generate a cryptographically secure Deliberate Lab API key
 */
export function generateDeliberateLabAPIKey(prefix = 'dlb_live_'): string {
  // Generate 32 random bytes and encode as base64url
  const key = randomBytes(32).toString('base64url');
  return `${prefix}${key}`;
}

/**
 * Hash a Deliberate Lab API key with salt for secure storage
 */
export async function hashDeliberateLabAPIKey(
  apiKey: string,
): Promise<{hash: string; salt: string}> {
  const salt = randomBytes(16).toString('hex');
  const hashBuffer = (await scryptAsync(apiKey, salt, 64)) as Buffer;
  return {
    hash: hashBuffer.toString('hex'),
    salt,
  };
}

/**
 * Get a key ID from a Deliberate Lab API key (first 8 chars of SHA-256 hash)
 */
export function getDeliberateLabKeyId(apiKey: string): string {
  const hash = createHash('sha256').update(apiKey).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Create and store a new Deliberate Lab API key
 */
export async function createDeliberateLabAPIKey(
  experimenterId: string,
  keyName: string,
  permissions: DeliberateLabAPIKeyPermission[] = [
    DeliberateLabAPIKeyPermission.READ,
    DeliberateLabAPIKeyPermission.WRITE,
  ],
): Promise<{apiKey: string; keyId: string}> {
  const firestore = app.firestore();

  // Generate the API key
  const apiKey = generateDeliberateLabAPIKey();
  const keyId = getDeliberateLabKeyId(apiKey);

  // Hash it for storage
  const {hash, salt} = await hashDeliberateLabAPIKey(apiKey);

  // Store in Firestore under experimenter's subcollection
  // keyId is stored as a field to enable indexed collection group queries
  await firestore
    .collection('experimenters')
    .doc(experimenterId)
    .collection('apiKeys')
    .doc(keyId)
    .set({
      keyId,
      hash,
      salt,
      experimenterId,
      name: keyName,
      permissions,
      createdAt: Date.now(),
      lastUsed: null,
    });

  return {apiKey, keyId};
}

/**
 * Verify a Deliberate Lab API key
 */
export async function verifyDeliberateLabAPIKey(
  apiKey: string,
): Promise<{valid: boolean; data?: DeliberateLabAPIKeyData}> {
  const firestore = app.firestore();

  // Get key ID to look up the document
  const keyId = getDeliberateLabKeyId(apiKey);

  // Indexed collection group query for O(1) lookup
  const snapshot = await firestore
    .collectionGroup('apiKeys')
    .where('keyId', '==', keyId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return {valid: false};
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as DeliberateLabAPIKeyData;

  // Check expiration
  if (data.expiresAt && data.expiresAt < Date.now()) {
    return {valid: false};
  }

  // Verify the hash using constant-time comparison to prevent timing attacks
  const computedHash = (await scryptAsync(apiKey, data.salt, 64)) as Buffer;
  const storedHash = Buffer.from(data.hash, 'hex');
  const isValid = timingSafeEqual(computedHash, storedHash);

  if (isValid) {
    // Update last used timestamp
    await doc.ref.update({
      lastUsed: Date.now(),
    });
  }

  return {valid: isValid, data: isValid ? data : undefined};
}

/**
 * Revoke a Deliberate Lab API key
 */
export async function revokeDeliberateLabAPIKey(
  keyId: string,
  experimenterId: string,
): Promise<boolean> {
  const firestore = app.firestore();

  const doc = await firestore
    .collection('experimenters')
    .doc(experimenterId)
    .collection('apiKeys')
    .doc(keyId)
    .get();

  if (!doc.exists) {
    return false;
  }

  const data = doc.data() as DeliberateLabAPIKeyData;

  // Check ownership
  if (data.experimenterId !== experimenterId) {
    return false;
  }

  // Delete the key from subcollection
  await firestore
    .collection('experimenters')
    .doc(experimenterId)
    .collection('apiKeys')
    .doc(keyId)
    .delete();

  return true;
}

/**
 * List Deliberate Lab API keys for an experimenter (returns metadata only, no actual keys)
 */
export async function listDeliberateLabAPIKeys(experimenterId: string): Promise<
  Array<{
    keyId: string;
    name: string;
    createdAt: number;
    lastUsed: number | null;
    permissions: DeliberateLabAPIKeyPermission[];
  }>
> {
  const firestore = app.firestore();

  const snapshot = await firestore
    .collection('experimenters')
    .doc(experimenterId)
    .collection('apiKeys')
    .get();

  return snapshot.docs.map((doc) => ({
    keyId: doc.id,
    name: doc.data().name,
    createdAt: doc.data().createdAt,
    lastUsed: doc.data().lastUsed,
    permissions: doc.data().permissions,
  }));
}
