/** Endpoints for interactions with participants */

import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';

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
