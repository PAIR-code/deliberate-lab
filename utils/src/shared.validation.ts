import {Type} from '@sinclair/typebox';
import {Visibility} from './shared';
import type {BehaviorEventInput} from './behavior';

/** UnifiedTimestamp input validation. */
export const UnifiedTimestampSchema = Type.Object({
  seconds: Type.Number(),
  nanoseconds: Type.Number(),
});

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

// Behavior event validation
export const BehaviorEventInputSchema = Type.Object({
  eventType: Type.String({minLength: 1}),
  relativeTimestamp: Type.Number(),
  stageId: Type.String({minLength: 1}),
  metadata: Type.Record(Type.String(), Type.Any()),
});

export const AddBehaviorEventsDataSchema = Type.Object({
  experimentId: Type.String({minLength: 1}),
  participantId: Type.String({minLength: 1}),
  events: Type.Array(BehaviorEventInputSchema, {minItems: 1, maxItems: 200}),
});
