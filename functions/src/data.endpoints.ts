import {
  ExperimentDownload,
  StageKind,
  createCohortDownload,
  createExperimentDownload,
  createParticipantDownload
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from './app';
import { AuthGuard } from './utils/auth-guard';

/** Return experiment data. */

// ************************************************************************* //
// getExperimentDownload endpoint                                            //
// (returns all data for experiment as ExperimentDownload object)            //
//                                                                           //
// Input structure: { experimentId }                                         //
// Validation: utils/src/data.validation.ts                                  //
// ************************************************************************* //

export const getExperimentDownload = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;
  const experimentId = data.experimentId;

  let response = null;

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Get experiment config
    const experimentConfigDoc =
      await app.firestore().doc(`experiments/${experimentId}`)
      .get();
    const experimentConfig = experimentConfigDoc.data();

    // Create experiment download
    const experimentDownload = createExperimentDownload(experimentConfig);

    // For each experiment stage config, add to ExperimentDownload
    const stageConfigCollection =
      await app.firestore().collection(`experiments/${experimentId}/stages`)
      .get();
    const stageConfigs = stageConfigCollection.docs.map(doc => doc.data());
    for (const stage of stageConfigs) {
      experimentDownload.stageMap[stage.id] = stage;
    }

    // For each participant, add ParticipantDownload
    const participantProfileCollection =
      await app.firestore().collection(`experiments/${experimentId}/participants`)
      .get();
    const profiles = participantProfileCollection.docs.map(doc => doc.data());
    for (const profile of profiles) {
      // Create new ParticipantDownload
      const participantDownload = createParticipantDownload(profile);

      // For each stage answer, add to ParticipantDownload map
      const answerCollection =
        await app.firestore().collection(`experiments/${experimentId}/participants/${profile.privateId}/stageData`)
        .get();
      const stageAnswers = answerCollection.docs.map(doc => doc.data());
      for (const stage of stageAnswers) {
        participantDownload.answerMap[stage.id] = stage;
      }
      // Add ParticipantDownload to ExperimentDownload
      experimentDownload.participantMap[profile.publicId] = participantDownload;
    }

    // For each cohort, add CohortDownload
    const cohortCollection =
      await app.firestore().collection(`experiments/${experimentId}/cohorts`)
      .get();
    const cohorts = cohortCollection.docs.map(cohort => cohort.data());
    for (const cohort of cohorts) {
      // Create new CohortDownload
      const cohortDownload = createCohortDownload(cohort);

      // For each public stage data, add to CohortDownload
      const publicStageCollection =
        await app.firestore().collection(`experiments/${experimentId}/cohorts/${cohort.id}/publicStageData`)
        .get();
      const publicStageData = publicStageCollection.docs.map(doc => doc.data());
      for (const data of publicStageData) {
        cohortDownload.dataMap[data.id] = data;
        // If chat stage, add list of chat messages to CohortDownload
        if (data.kind === StageKind.CHAT) {
          const chatCollection =
            await app.firestore().collection(`experiments/${experimentId}/cohorts/${cohort.id}/publicStageData/${data.id}/chats`)
            .orderBy('timestamp', 'asc')
            .get();
          const chatList = chatCollection.docs.map(doc => doc.data());
          cohortDownload.chatMap[data.id] = chatList;
        }
      }

      // Add CohortDownload to ExperimentDownload
      experimentDownload.cohortMap[cohort.id] = cohortDownload;
    }

    // Set experiment download as endpoint response
    response = experimentDownload;
  });

  return { data: response };
});
