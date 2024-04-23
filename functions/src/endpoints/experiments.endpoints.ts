/** Endpoints for interactions with experiments */

import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { ParticipantSeeder } from '../seeders/participants.seeder';
import { createParticipantUser } from '../utils/create-participant-user';
import { replaceChatStagesUuid } from '../utils/replace-chat-uuid';

/** Fetch all experiments in database (not paginated) */
export const experiments = onCall(async () => {
  const experiments = await app.firestore().collection('experiments').get();
  const data = experiments.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
  return { data };
});

/** Fetch a specific experiment's extended data (ie: the experiment and all of its associated users) */
export const experiment = onCall(async (request) => {
  const { experimentUid } = request.data;

  if (!experimentUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing experiment UID');
  }

  const experiment = await app.firestore().collection('experiments').doc(experimentUid).get();

  if (!experiment.exists) {
    throw new functions.https.HttpsError('not-found', 'Experiment not found');
  }

  const experimentData = experiment.data();

  if (!experimentData) {
    throw new functions.https.HttpsError('internal', 'Experiment data is missing');
  }

  const participants = await app
    .firestore()
    .collection('participants')
    .where('experimentId', '==', experimentUid)
    .get();

  const data = {
    ...experimentData,
    uid: experiment.id,
    participants: participants.docs.map((doc) => ({ uid: doc.id, ...doc.data() })),
  };

  return data;
});

export const deleteExperiment = onCall(async (request) => {
  const { experimentId } = request.data;

  if (!experimentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing experiment UID');
  }

  const experiment = await app.firestore().collection('experiments').doc(experimentId).get();

  if (!experiment.exists) {
    throw new functions.https.HttpsError('not-found', 'Experiment not found');
  }

  // Delete all participants associated with the experiment
  const participants = await app
    .firestore()
    .collection('participants')
    .where('experimentId', '==', experimentId)
    .get();

  const batch = app.firestore().batch();
  batch.delete(experiment.ref);
  participants.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return { data: `Experiment of ID ${experimentId} was successfully deleted` };
});

export const createExperiment = onCall(async (request) => {
  let uid = '';
  // Extract data from the body
  const { name, stageMap, numberOfParticipants, allowedStageProgressionMap } = request.data;
  const date = new Date();

  const chatIds = replaceChatStagesUuid(stageMap); // Assign a new UUID to each chat stage

  await app.firestore().runTransaction(async (transaction) => {
    // Create the main parent experiment
    const experiment = app.firestore().collection('experiments').doc();
    transaction.set(experiment, {
      name,
      date,
      numberOfParticipants,
    });
    uid = experiment.id;

    // Create all derived participants with their stages
    const participants = ParticipantSeeder.createMany(
      experiment.id,
      stageMap,
      allowedStageProgressionMap,
      numberOfParticipants,
    );

    const progressions: Record<string, string> = {};
    const participantRefs: string[] = [];

    for (const participant of participants) {
      const participantRef = app.firestore().collection('participants').doc();
      participantRefs.push(participantRef.id);
      progressions[participantRef.id] = participant.workingOnStageName;
      transaction.set(participantRef, participant);

      // Create a user for this participant
      await createParticipantUser(participantRef.id, participant.name, chatIds);
    }

    // Create the progression data in a separate collection
    const progressionRef = app.firestore().doc(`participants_progressions/${experiment.id}`);
    transaction.set(progressionRef, {
      experimentId: experiment.id,
      progressions,
    });

    for (const chatId of chatIds) {
      const ref = app.firestore().doc(`participants_ready_to_end_chat/${chatId}`);
      const readyToEndChat = participantRefs.reduce(
        (acc, uid) => {
          acc[uid] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      transaction.set(ref, { chatId, readyToEndChat, currentPair: 0 });
    }
  });

  return { data: 'Experiment created successfully', uid };
});
