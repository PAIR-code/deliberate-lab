import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';
import {
  InitializeVariableCohortsData,
  GetParticipantVariablesData,
  ExperimentVariables,
  VariableCohort,
  validateInitialCohort,
  getAssignableCohorts,
  resolveParticipantVariables,
  createCohortConfig,
  createMetadataConfig,
} from '@deliberation-lab/utils';
import {app} from './app';
import {createCohortInternal} from './cohort.utils';
import {Value} from '@sinclair/typebox/value';
import {
  getFirestoreExperiment,
  getFirestoreParticipant,
} from './utils/firestore';
import {AuthGuard} from './utils/auth-guard';
import {prettyPrintErrors} from './utils/validation';

/**
 * Initialize variable cohorts for an experiment
 * Creates cohorts based on the variable configuration
 */
export const initializeVariableCohorts = onCall(
  {
    cors: true,
    region: 'us-central1',
  },
  async (request) => {
    // Validate request data
    const {data} = request;
    if (!Value.Check(InitializeVariableCohortsData, data)) {
      prettyPrintErrors(Value.Errors(InitializeVariableCohortsData, data));
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid request data',
      );
    }

    // Check authentication
    await AuthGuard.isExperimenter(request);

    const {experimentId, variables, replaceExisting = false} = data;

    // Validate variable configuration
    if (!validateInitialCohort(variables)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Only one cohort can be marked as initial cohort',
      );
    }

    const assignableCohorts = getAssignableCohorts(variables);
    if (assignableCohorts.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'At least one non-initial cohort is required for assignment',
      );
    }

    try {
      // Get the experiment to ensure it exists and user has access
      const experiment = await getFirestoreExperiment(experimentId);
      if (!experiment) {
        throw new functions.https.HttpsError(
          'not-found',
          'Experiment not found',
        );
      }

      // Check if user has write access
      const userEmail = request.auth?.token?.email || '';
      if (
        experiment.permissions.visibility === 'private' &&
        experiment.metadata.creator !== userEmail &&
        !experiment.permissions.readers.includes(userEmail)
      ) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to modify this experiment',
        );
      }

      // Start a transaction to ensure atomic updates
      await app.firestore().runTransaction(async (transaction) => {
        // If replaceExisting, delete existing cohorts first
        if (replaceExisting) {
          const existingCohorts = await app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('cohorts')
            .get();

          // Check if any cohort has participants
          for (const cohortDoc of existingCohorts.docs) {
            const participantsSnapshot = await app
              .firestore()
              .collection('experiments')
              .doc(experimentId)
              .collection('participants')
              .where('currentCohortId', '==', cohortDoc.id)
              .limit(1)
              .get();

            if (!participantsSnapshot.empty) {
              throw new functions.https.HttpsError(
                'failed-precondition',
                `Cannot delete cohort ${cohortDoc.data().metadata?.name || cohortDoc.id} - it has participants`,
              );
            }
          }

          // Delete existing cohorts
          for (const cohortDoc of existingCohorts.docs) {
            transaction.delete(cohortDoc.ref);
          }
        }

        // Create new cohorts based on variable configuration
        for (const cohortName of Object.keys(variables.cohorts)) {
          const cohortConfig: VariableCohort = variables.cohorts[cohortName];
          // Create cohort configuration
          const cohort = createCohortConfig({
            metadata: createMetadataConfig({
              name: cohortName,
              publicName: cohortName,
              description:
                cohortConfig.description || `Variable cohort: ${cohortName}`,
              tags: cohortConfig.isInitialCohort
                ? ['initial', 'variables']
                : ['variables'],
            }),
            participantConfig: experiment.defaultCohortConfig,
          });

          // Store cohort using internal utility
          await createCohortInternal(transaction, experimentId, cohort);

          // Store the cohort ID in the cohort config
          cohortConfig.cohortId = cohort.id;
        }

        // Update experiment with variables configuration (now includes cohort IDs)
        const experimentRef = app
          .firestore()
          .collection('experiments')
          .doc(experimentId);

        transaction.update(experimentRef, {
          variables: variables,
          dateEdited: new Date(),
        });
      });

      return {
        success: true,
        message: `Created ${Object.keys(variables.cohorts).length} variable cohorts`,
      };
    } catch (error) {
      console.error('Error initializing variable cohorts:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to initialize variable cohorts',
      );
    }
  },
);

/**
 * Get resolved variables for a participant based on their cohort
 */
export const getParticipantVariables = onCall(
  {
    cors: true,
    region: 'us-central1',
  },
  async (request) => {
    // Validate request data
    const {data} = request;
    if (!Value.Check(GetParticipantVariablesData, data)) {
      prettyPrintErrors(Value.Errors(GetParticipantVariablesData, data));
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid request data',
      );
    }

    // Check authentication - participant must be signed in
    if (!request.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated',
      );
    }
    const uid = request.auth.uid;

    const {experimentId, participantId} = data;

    try {
      // Get experiment with variables
      const experiment = await getFirestoreExperiment(experimentId);
      if (!experiment) {
        throw new functions.https.HttpsError(
          'not-found',
          'Experiment not found',
        );
      }

      // Check if experiment has variables configured
      if (!experiment.variables) {
        return {variables: {}}; // No variables configured
      }

      // Get participant profile
      const participant = await getFirestoreParticipant(
        experimentId,
        participantId,
      );
      if (!participant) {
        throw new functions.https.HttpsError(
          'not-found',
          'Participant not found',
        );
      }

      // Verify the participant matches the authenticated user
      if (participant.privateId !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only access your own variables',
        );
      }

      // Get the participant's current cohort
      const cohortId = participant.currentCohortId;
      if (!cohortId) {
        // Participant not in a cohort yet, return defaults
        return {variables: {}};
      }

      // Get cohort configuration
      const cohortDoc = await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('cohorts')
        .doc(cohortId)
        .get();

      if (!cohortDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Cohort not found');
      }

      const cohort = cohortDoc.data();
      const cohortName = cohort?.metadata?.name || '';

      // Resolve variables for this cohort
      const resolvedVariables = resolveParticipantVariables(
        experiment.variables as ExperimentVariables,
        cohortName,
      );

      return {
        variables: resolvedVariables,
        cohortName: cohortName,
      };
    } catch (error) {
      console.error('Error getting participant variables:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to get participant variables',
      );
    }
  },
);
