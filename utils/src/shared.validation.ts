import { Type } from '@sinclair/typebox';
import { Visibility } from './shared';

/** MetadataConfig input validation. */
export const MetadataConfigSchema = Type.Object({
  name: Type.String(),
  publicName: Type.String(),
  description: Type.String(),
  tags: Type.Array(Type.String()),
  // creator - set by cloud functions endpoint
  // starred - initialized by cloud functions endpoint
  // dateCreated - set by cloud functions endpoint
  // dateEdited - set by cloud functions endpoint
});

/** PermissionsConfig input validation. */
export const PermissionsConfigSchema = Type.Object({
  visibility: Type.Union([
    Type.Literal(Visibility.PUBLIC),
    Type.Literal(Visibility.PRIVATE),
  ]),
  readers: Type.Array(Type.String()),
});