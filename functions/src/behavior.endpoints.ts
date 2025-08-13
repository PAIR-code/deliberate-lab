import {onCall} from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import {app} from './app';
import {Type} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';

// Local schema to avoid depending on utils build output
const BehaviorEventInputSchema = Type.Object({
  eventType: Type.String({minLength: 1}),
  relativeTimestamp: Type.Number(),
  stageId: Type.String({minLength: 1}),
  metadata: Type.Record(Type.String(), Type.Any()),
});

const AddBehaviorEventsDataSchema = Type.Object({
  experimentId: Type.String({minLength: 1}),
  participantId: Type.String({minLength: 1}),
  events: Type.Array(BehaviorEventInputSchema, {minItems: 1, maxItems: 200}),
});

/**
 * addBehaviorEvents: batched append-only event log under participant.
 * Path: experiments/{experimentId}/participants/{participantPrivateId}/behavior/{autoId}
 */
export const addBehaviorEvents = onCall(async (request) => {
  const {data} = request as {
    data: {experimentId: string; participantId: string; events: unknown[]};
  };

  if (!Value.Check(AddBehaviorEventsDataSchema, data)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
  }

  const batch = app.firestore().batch();
  const base = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantId)
    .collection('behavior');

  for (const evt of data.events as Array<{
    eventType: string;
    relativeTimestamp: number;
    stageId: string;
    metadata?: Record<string, unknown>;
  }>) {
    const ref = base.doc();
    batch.set(ref, {
      type: evt.eventType,
      relativeTimestamp: evt.relativeTimestamp,
      stageId: evt.stageId,
      metadata: evt.metadata ?? {},
      timestamp: new Date(), // server time
    });
  }

  await batch.commit();
  return {success: true, count: data.events.length};
});
