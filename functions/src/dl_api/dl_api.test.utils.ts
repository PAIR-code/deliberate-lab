/**
 * Shared test utilities for Deliberate Lab API integration tests
 *
 * This module provides common setup, helpers, and cleanup functions
 * for API integration tests that require the Firestore emulator.
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  DeliberateLabAPIKeyPermission,
  StageConfig,
} from '@deliberation-lab/utils';
import {
  createDeliberateLabAPIKey,
  verifyDeliberateLabAPIKey,
} from './dl_api_key.utils';

// ============================================================================
// Types
// ============================================================================

export interface TestContext {
  testEnv: RulesTestEnvironment;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  firestore: any;
  apiKey: string;
  baseUrl: string;
  experimenterId: string;
}

// ============================================================================
// Constants
// ============================================================================

export const TEST_EXPERIMENTER_ID = 'test-experimenter@example.com';
export const EXPERIMENTS_COLLECTION = 'experiments';
const PROJECT_ID = 'demo-deliberate-lab';

// ============================================================================
// Setup & Teardown
// ============================================================================

/**
 * Initialize the test environment with Firestore emulator and API key
 */
export async function setupTestContext(testName: string): Promise<TestContext> {
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: process.env.FIRESTORE_EMULATOR_HOST
      ? undefined
      : {
          host: 'localhost',
          port: 8081,
        },
  });

  const firestore = testEnv.unauthenticatedContext().firestore();
  firestore.settings({ignoreUndefinedProperties: true, merge: true});

  // Create test API key
  console.log(`Creating API key for ${testName}...`);
  const {apiKey} = await createDeliberateLabAPIKey(
    TEST_EXPERIMENTER_ID,
    `Test API Key - ${testName}`,
    [DeliberateLabAPIKeyPermission.READ, DeliberateLabAPIKeyPermission.WRITE],
  );

  // Verify the key
  console.log('Verifying API key...');
  const {valid, data} = await verifyDeliberateLabAPIKey(apiKey);
  console.log('API key valid:', valid);
  if (!valid || !data) {
    throw new Error('API key verification failed');
  }

  // Construct base URL
  const functionsHost =
    process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST || 'localhost';
  const functionsPort = process.env.FIREBASE_FUNCTIONS_EMULATOR_PORT || '5101';
  const region = 'us-central1';
  const baseUrl = `http://${functionsHost}:${functionsPort}/${PROJECT_ID}/${region}/api`;
  console.log('API base URL:', baseUrl);

  return {
    testEnv,
    firestore,
    apiKey,
    baseUrl,
    experimenterId: TEST_EXPERIMENTER_ID,
  };
}

/**
 * Clean up the test environment
 */
export async function teardownTestContext(ctx: TestContext): Promise<void> {
  await ctx.testEnv.cleanup();
}

/**
 * Clean up an experiment and its subcollections.
 * Uses withSecurityRulesDisabled to bypass Firestore rules for cleanup.
 */
export async function cleanupExperiment(
  testEnv: RulesTestEnvironment,
  experimentId: string,
): Promise<void> {
  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const expRef = firestore
        .collection(EXPERIMENTS_COLLECTION)
        .doc(experimentId);

      // Delete cohorts subcollection
      const cohorts = await expRef.collection('cohorts').get();
      for (const cohort of cohorts.docs) {
        await cohort.ref.delete();
      }

      // Delete stages subcollection
      const stages = await expRef.collection('stages').get();
      for (const stage of stages.docs) {
        await stage.ref.delete();
      }

      // Delete experiment document
      await expRef.delete();
    });
  } catch (error) {
    console.error('Error cleaning up experiment:', experimentId, error);
  }
}

// ============================================================================
// API Request Helper
// ============================================================================

/**
 * Create a helper function for making authenticated API requests
 */
export function createApiRequestHelper(baseUrl: string, apiKey: string) {
  return async function apiRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return fetch(`${baseUrl}${path}`, options);
  };
}

// ============================================================================
// Experiment Helpers
// ============================================================================

/**
 * Create an experiment via the API
 */
export async function createExperimentViaApi(
  apiRequest: ReturnType<typeof createApiRequestHelper>,
  name: string,
  description: string = 'Test experiment',
  stages: StageConfig[] = [],
): Promise<string> {
  const response = await apiRequest('POST', '/v1/experiments', {
    name,
    description,
    stages: JSON.parse(JSON.stringify(stages)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to create experiment: ${response.status} ${errorBody}`,
    );
  }

  const data = await response.json();
  return data.experiment.id;
}

// ============================================================================
// Cohort Helpers
// ============================================================================

export interface CreateCohortOptions {
  description?: string;
  participantConfig?: {
    minParticipantsPerCohort?: number;
    maxParticipantsPerCohort?: number;
  };
}

/**
 * Create a cohort via the API
 */
export async function createCohortViaApi(
  apiRequest: ReturnType<typeof createApiRequestHelper>,
  experimentId: string,
  name: string,
  options: CreateCohortOptions = {},
): Promise<string> {
  const body: Record<string, unknown> = {name};
  if (options.description !== undefined) {
    body.description = options.description;
  }
  if (options.participantConfig !== undefined) {
    body.participantConfig = options.participantConfig;
  }

  const response = await apiRequest(
    'POST',
    `/v1/experiments/${experimentId}/cohorts`,
    body,
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create cohort: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.cohort.id;
}

// ============================================================================
// Firestore Helpers
// ============================================================================

/**
 * Serialize data for Firestore (converts Timestamps to plain objects)
 */
export function serializeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}
