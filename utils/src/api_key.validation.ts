/**
 * Runtime validation schemas for API key types
 */

import {Type, Static} from '@sinclair/typebox';
import {APIKeyPermission} from './api_key';

/** Schema for APIKeyPermission enum */
export const APIKeyPermissionSchema = Type.Enum(APIKeyPermission);

/** Schema for APIKeyData */
export const APIKeyDataSchema = Type.Object({
  hash: Type.String(),
  salt: Type.String(),
  experimenterId: Type.String(),
  name: Type.String(),
  permissions: Type.Array(APIKeyPermissionSchema),
  createdAt: Type.Number(),
  lastUsed: Type.Union([Type.Number(), Type.Null()]),
  expiresAt: Type.Optional(Type.Number()),
});

export type APIKeyDataType = Static<typeof APIKeyDataSchema>;
