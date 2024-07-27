/** Chat message endpoints */
import { Value } from '@sinclair/typebox/value';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';

import { MessageData, MessageKind, ParticipantProfile } from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import { AuthGuard } from '../utils/auth-guard';

export const message = onCall(async (request) => {
  const { data } = request;

  if (Value.Check(MessageData, data)) {
    // Validate authentication status for experimenter messages
    if (data.message.kind === MessageKind.DiscussItemsMessage)
      await AuthGuard.isExperimenter(request);

    const timestamp = Timestamp.now();

    const participants = await app
      .firestore()
      .collection(`experiments/${data.experimentId}/participants`)
      .get();

    // If it's a user message, replace the private id by the public id
    // Participant private IDs must be masked because they are used for authentication
    if (data.message.kind === MessageKind.UserMessage) {
      const participantDoc = await app
        .firestore()
        .doc(
          `experiments/${data.experimentId}/participants/${data.message.fromPrivateParticipantId}`,
        )
        .get();

      // Ignore ts warnings because we immediately write the data to firestore and do not need to keep consistent types until then
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      const participant = participantDoc.data() as ParticipantProfile; // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      delete data.message.fromPrivateParticipantId; // @ts-ignore
      data.message.fromPublicParticipantId = participant.publicId; // see [UserMessage] type
    }

    // Create all messages in transaction
    await app.firestore().runTransaction(async (transaction) => {
      const publicStageData = await app
        .firestore()
        .collection(
          `experiments/${data.experimentId}/publicStageData/${data.stageId}/messages`
        );

      transaction.set(publicStageData.doc(), { ...data.message, timestamp });
    });

    return { data: 'success' };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
