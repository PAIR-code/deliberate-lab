/**
 * Endpoints for seeding the database with dummy data.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { ExperimentSeeder } from '../seeders/experiments.seeder';
import { ParticipantSeeder } from '../seeders/participants.seeder';
import { TemplatesSeeder } from '../seeders/templates.seeder';
import { createParticipantUser } from '../utils/create-participant-user';

export const seedDatabase = onRequest(async (request, response) => {
  if (process.env.SEEDER_PASSWORD !== request.query.seeder_password) {
    response.status(401).send('Unauthorized');
    return;
  }

  // Create the default template and add it to the database
  const template = TemplatesSeeder.create();
  await app.firestore().collection('templates').add(template);

  // Add one base experiment
  const experiment = await app.firestore().collection('experiments').add(ExperimentSeeder.create());

  // Create 3 participants for this experiment
  const batch = app.firestore().batch();

  // Reuse the template and inject a uuid for the chat stage
  const chatId = uuidv4();
  template.stageMap['3. Group discussion'].config.chatId = chatId as unknown as null; // Trick to silence the TS error

  const participants = ParticipantSeeder.createMany(
    experiment.id,
    template.stageMap,
    template.allowedStageProgressionMap,
    3,
  );
  const progressions: Record<string, string> = {};
  const readyToEndChat: Record<string, boolean> = {};

  for (const participant of participants) {
    // Get a unique ID for the participant
    const participantId = uuidv4(); // Use a uuid (is valid in email addresses, contrary to Firestore ids which can be uppercase)
    const ref = app.firestore().collection('participants').doc(participantId);

    // Add the participant to the batch write
    batch.set(ref, participant);

    // Add the participant to the progression map
    progressions[ref.id] = participant.workingOnStageName;
    readyToEndChat[ref.id] = false;

    // Create a user for this participant
    await createParticipantUser(ref.id, experiment.id, participant.name, [chatId]);
  }

  // Create their progression data in a separate collection (for synchronization purposes)
  let ref = app.firestore().doc(`participants_progressions/${experiment.id}`);
  batch.set(ref, {
    experimentId: experiment.id,
    progressions,
  });

  // Create the `ready_to_end_chat` entry for synchronization purposes
  ref = app.firestore().doc(`participants_ready_to_end_chat/${chatId}`);
  batch.set(ref, {
    chatId,
    readyToEndChat,
    currentPair: 0,
  });

  // Commit the batch write
  await batch.commit();

  response.send('Database seeded!');
});
