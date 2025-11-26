/**
 * Deliberate Lab API Key types and enums shared between frontend and backend
 */

export enum DeliberateLabAPIKeyPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface DeliberateLabAPIKeyData {
  keyId: string;
  hash: string;
  salt: string;
  experimenterId: string;
  name: string;
  permissions: DeliberateLabAPIKeyPermission[];
  createdAt: number;
  lastUsed: number | null;
  expiresAt?: number;
}

/**
 * Deliberate Lab API key information returned to the frontend
 * (without sensitive data like hash/salt)
 */
export interface DeliberateLabAPIKey {
  keyId: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  permissions: string[];
}
