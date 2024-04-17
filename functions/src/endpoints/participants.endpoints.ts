/** Endpoints for interactions with participants */

import { Value } from '@sinclair/typebox/value';
import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';
import { checkStageProgression } from '../utils/check-stage-progression';
import { ProfileAndTOS } from '../validation/participants.validation';
import {
  GenericStageUpdate,
  ToggleReadyToEndChat,
  validateStageUpdateAndMerge,
} from '../validation/stages.validation';

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
    await participant.ref.update(checkStageProgression(participant, body));
    response.send({ uid: participant.id, ...body }); // Send back the data
  } else {
    response.status(400).send('Invalid data');
    return;
  }
});

/** Generic endpoint for stage update. */
export const updateStage = onRequest(async (request, response) => {
  const participantUid = request.params[0];

  if (!participantUid) {
    response.status(400).send('Missing participant UID');
    return;
  }

  // Validate the generic stage update data
  const { body } = request;
  if (Value.Check(GenericStageUpdate, body)) {
    const participant = await app.firestore().collection('participants').doc(participantUid).get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageMap: Record<string, any> = participant.data()?.stageMap;

    if (!stageMap || !stageMap[body.name]) {
      response.status(404).send('Stage not found');
      return;
    }

    const stage = stageMap[body.name];
    const valid = validateStageUpdateAndMerge(stage, body.data);

    if (!valid) response.status(400).send(`Invalid stage kind for update : ${stage.kind}`);
    else {
      // Patch the data
      const { justFinishedStageName } = body;
      await participant.ref.update(
        checkStageProgression(participant, { justFinishedStageName, stageMap }),
      );
      response.send({ uid: participantUid }); // Send back the uid for refetch
    }
  }
});

/** Toggle On/Off ready state for given participant and chat */
export const toggleReadyToEndChat = onRequest(async (request, response) => {
  const participantUid = request.params[0];

  if (!participantUid) {
    response.status(400).send('Missing participant UID');
    return;
  }

  const { body } = request;

  if (Value.Check(ToggleReadyToEndChat, body)) {
    const ref = app.firestore().collection('participants_ready_to_end_chat').doc(body.chatId);
    await ref.update({ [`readyToEndChat.${participantUid}`]: body.readyToEndChat });
    response.send({ uid: participantUid });
    return;
  }

  response.status(400).send('Invalid data');
});
