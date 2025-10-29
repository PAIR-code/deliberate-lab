/**
 * API Key Management Module
 * Handles generation, hashing, storage, and verification of API keys
 */

import * as admin from 'firebase-admin';
import {randomBytes, scrypt, createHash} from 'crypto';
import {promisify} from 'util';
import {APIKeyPermission, APIKeyData} from '@deliberation-lab/utils';

const scryptAsync = promisify(scrypt);

/**
 * Extract API key from Bearer token in Authorization header
 * @param authHeader - The Authorization header value
 * @returns The extracted API key or null if not found/invalid
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Generate a cryptographically secure API key
 */
export function generateAPIKey(prefix = 'dlb_live_'): string {
  // Generate 32 random bytes and encode as base64url
  const key = randomBytes(32).toString('base64url');
  return `${prefix}${key}`;
}

/**
 * Hash an API key with salt for secure storage
 */
export async function hashAPIKey(
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
 * Get a key ID from an API key (first 8 chars of SHA-256 hash)
 */
export function getKeyId(apiKey: string): string {
  const hash = createHash('sha256').update(apiKey).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Create and store a new API key
 */
export async function createAPIKey(
  experimenterId: string,
  keyName: string,
  permissions: APIKeyPermission[] = [
    APIKeyPermission.READ,
    APIKeyPermission.WRITE,
  ],
): Promise<{apiKey: string; keyId: string}> {
  const app = admin.app();
  const firestore = app.firestore();

  // Generate the API key
  const apiKey = generateAPIKey();
  const keyId = getKeyId(apiKey);

  // Hash it for storage
  const {hash, salt} = await hashAPIKey(apiKey);

  // Store in Firestore
  await firestore.collection('apiKeys').doc(keyId).set({
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
 * Verify an API key
 */
export async function verifyAPIKey(
  apiKey: string,
): Promise<{valid: boolean; data?: APIKeyData}> {
  const app = admin.app();
  const firestore = app.firestore();

  // Get key ID to look up the document
  const keyId = getKeyId(apiKey);

  // Look up in Firestore
  const doc = await firestore.collection('apiKeys').doc(keyId).get();
  if (!doc.exists) {
    return {valid: false};
  }

  const data = doc.data() as APIKeyData;

  // Check expiration
  if (data.expiresAt && data.expiresAt < Date.now()) {
    return {valid: false};
  }

  // Verify the hash
  const hashBuffer = (await scryptAsync(apiKey, data.salt, 64)) as Buffer;
  const isValid = hashBuffer.toString('hex') === data.hash;

  if (isValid) {
    // Update last used timestamp
    await firestore.collection('apiKeys').doc(keyId).update({
      lastUsed: Date.now(),
    });
  }

  return {valid: isValid, data: isValid ? data : undefined};
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(
  keyId: string,
  experimenterId: string,
): Promise<boolean> {
  const app = admin.app();
  const firestore = app.firestore();

  const doc = await firestore.collection('apiKeys').doc(keyId).get();
  if (!doc.exists) {
    return false;
  }

  const data = doc.data() as APIKeyData;

  // Check ownership
  if (data.experimenterId !== experimenterId) {
    return false;
  }

  // Delete the key
  await firestore.collection('apiKeys').doc(keyId).delete();
  return true;
}

/**
 * List API keys for an experimenter (returns metadata only, no actual keys)
 */
export async function listAPIKeys(experimenterId: string): Promise<
  Array<{
    keyId: string;
    name: string;
    createdAt: number;
    lastUsed: number | null;
    permissions: APIKeyPermission[];
  }>
> {
  const app = admin.app();
  const firestore = app.firestore();

  const snapshot = await firestore
    .collection('apiKeys')
    .where('experimenterId', '==', experimenterId)
    .get();

  return snapshot.docs.map((doc) => ({
    keyId: doc.id,
    name: doc.data().name,
    createdAt: doc.data().createdAt,
    lastUsed: doc.data().lastUsed,
    permissions: doc.data().permissions,
  }));
}
