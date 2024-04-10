/** Endpoints for interactions with participants */

import { Value } from '@sinclair/typebox/value';
import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';
import { ProfileAndTOS } from '../validation/participants.validation';

/** Fetch a specific participant */
export const participant = onRequest(async (request, response) => {
  const participantUid = request.params[0];

  if (!participantUid) {
    response.status(400).send('Missing participant UID');
    return;
  }

  const participant = await app.firestore().collection('participants').doc(participantUid).get();

  if (!participant.exists) {
    response.status(404).send('Participant not found');
    return;
  }

  const data = { uid: participant.id, ...participant.data() };

  response.send({ data });
});

/** Update the profile and terms of service acceptance date for a participant */
export const updateProfileAndTOS = onRequest(async (request, response) => {
  const participantUid = request.params[0];

  if (!participantUid) {
    response.status(400).send('Missing participant UID');
    return;
  }

  const participant = await app.firestore().collection('participants').doc(participantUid).get();

  if (!participant.exists) {
    response.status(404).send('Participant not found');
    return;
  }

  // Validate the body data
  const { body } = request;
  if (Value.Check(ProfileAndTOS, body)) {
    // Patch the data
    await participant.ref.update(body);
    response.send({ data: { uid: participant.id, ...body } }); // Send back the data
  } else {
    response.status(400).send('Invalid data');
    return;
  }
});
