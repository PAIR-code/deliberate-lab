/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { v4 as uuidv4 } from 'uuid';
import { ExperimentSeeder } from './seeders/experiments.seeder';
import { ParticipantSeeder } from './seeders/participants.seeder';
import { StagesSeeder } from './seeders/stages.seeder';
import { TemplatesSeeder } from './seeders/templates.seeder';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const app = admin.initializeApp();

export const seedDatabase = onRequest(async (request, response) => {
  // TODO: check request auth (avoid generating dummy stuff without checking)

  // Create the default template and add it to the database
  await app.firestore().collection('templates').add(TemplatesSeeder.create());

  // Add one base experiment
  const experiment = await app.firestore().collection('experiments').add(ExperimentSeeder.create());

  // Create 3 participants for this experiment
  const batch = app.firestore().batch();

  const stages = StagesSeeder.createMany();
  stages[2].config.chatId = uuidv4() as unknown as null; // Trick to silence the TS error

  ParticipantSeeder.createMany(experiment.id, stages, 3).forEach((participant) => {
    // Get a unique ID for the participant
    const ref = app.firestore().collection('participants').doc();

    // Add the participant to the batch write
    batch.set(ref, participant);
  });

  // Commit the batch write
  await batch.commit();

  response.send('Database seeded!');
});
