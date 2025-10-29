/**
 * API Key types and enums shared between frontend and backend
 */

export enum APIKeyPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface APIKeyData {
  hash: string;
  salt: string;
  experimenterId: string;
  name: string;
  permissions: APIKeyPermission[];
  createdAt: number;
  lastUsed: number | null;
  expiresAt?: number;
}
