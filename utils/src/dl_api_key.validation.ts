/**
 * Runtime validation schemas for Deliberate Lab API key types
 */

import {Type, Static} from '@sinclair/typebox';
import {DeliberateLabAPIKeyPermission} from './dl_api_key';

/** Schema for DeliberateLabAPIKeyPermission enum */
export const DeliberateLabAPIKeyPermissionSchema = Type.Enum(
  DeliberateLabAPIKeyPermission,
);

/** Schema for DeliberateLabAPIKeyData */
export const DeliberateLabAPIKeyDataSchema = Type.Object({
  keyId: Type.String(),
  hash: Type.String(),
  salt: Type.String(),
  experimenterId: Type.String(),
  name: Type.String(),
  permissions: Type.Array(DeliberateLabAPIKeyPermissionSchema),
  createdAt: Type.Number(),
  lastUsed: Type.Union([Type.Number(), Type.Null()]),
  expiresAt: Type.Optional(Type.Number()),
});

export type DeliberateLabAPIKeyDataType = Static<
  typeof DeliberateLabAPIKeyDataSchema
>;
