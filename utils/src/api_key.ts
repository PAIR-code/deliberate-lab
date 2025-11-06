/**
 * Deliberate Lab API Key types and enums shared between frontend and backend
 */

export enum DeliberateLabAPIKeyPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface DeliberateLabAPIKeyData {
  hash: string;
  salt: string;
  experimenterId: string;
  name: string;
  permissions: DeliberateLabAPIKeyPermission[];
  createdAt: number;
  lastUsed: number | null;
  expiresAt?: number;
}
