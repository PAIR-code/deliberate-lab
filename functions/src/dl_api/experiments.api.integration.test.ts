/**
 * Integration tests for API experiment creation vs traditional template-based creation
 *
 * These tests verify that experiments created via the REST API are equivalent
 * to experiments created using the traditional template system.
 *
 * This test assumes that a Firestore emulator is running.
 * Run using: npm run test:firestore experiments.api.integration.test.ts
 * Or: firebase emulators:exec --only firestore "npx jest experiments.api.integration.test.ts"
 */

// Don't override GCLOUD_PROJECT - let firebase emulators:exec set it
// If not set, use a demo project ID that the emulator will accept
if (!process.env.GCLOUD_PROJECT) {
  process.env.GCLOUD_PROJECT = 'demo-deliberate-lab';
}

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as admin from 'firebase-admin';
import request from 'supertest';
import express from 'express';
import {
  createExperimentConfig,
  StageConfig,
  ExperimentTemplate,
  Experiment,
  APIKeyPermission,
} from '@deliberation-lab/utils';
import {createAPIKey, verifyAPIKey} from './api_key.utils';

// Import actual experiment templates from frontend
import {getFlipCardExperimentTemplate} from '../../../frontend/src/shared/templates/flipcard';
import {getQuickstartGroupChatTemplate} from '../../../frontend/src/shared/templates/quickstart_group_chat';
import {getPolicyExperimentTemplate} from '../../../frontend/src/shared/templates/policy';

// Import Express app (we'll need to extract it from the API module)
import {authenticateAPIKey} from './api.utils';
import {
  listExperiments,
  createExperiment,
  getExperiment,
  updateExperiment,
  deleteExperiment,
  exportExperimentData,
} from './experiments.api';

let testEnv: RulesTestEnvironment;
// Use any for firestore as the RulesTestEnvironment type is complex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firestore: any;
let testAPIKey: string;
let testApp: express.Application;

// Test configuration
const TEST_EXPERIMENTER_ID = 'test-experimenter@example.com';
const EXPERIMENTS_COLLECTION = 'experiments';

// Create Express app for testing (mimics api.endpoints.ts)
function createTestAPIApp(): express.Application {
  const app = express();
  app.use(express.json());

  // Skip rate limiting in tests
  // Skip browser rejection in tests for supertest compatibility

  // Add authentication
  app.use(authenticateAPIKey);

  // API Routes
  app.post('/v1/experiments', createExperiment);
  app.get('/v1/experiments/:id', getExperiment);
  app.get('/v1/experiments', listExperiments);
  app.put('/v1/experiments/:id', updateExperiment);
  app.delete('/v1/experiments/:id', deleteExperiment);
  app.get('/v1/experiments/:id/export', exportExperimentData);

  return app;
}

// Note: We rely on FIRESTORE_EMULATOR_HOST environment variable to connect
// both the admin SDK and the API code to the emulator

describe('API Experiment Creation Integration Tests', () => {
  // Store created experiment IDs for cleanup
  const createdExperimentIds: string[] = [];

  beforeAll(async () => {
    // Use the same project ID that the emulator will use
    const projectId = process.env.GCLOUD_PROJECT || 'demo-deliberate-lab';

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: 'localhost',
        port: 8081,
      },
    });
    firestore = testEnv.unauthenticatedContext().firestore();
    firestore.settings({ignoreUndefinedProperties: true, merge: true});

    // Initialize Firebase Admin SDK (will use emulator via FIRESTORE_EMULATOR_HOST environment variable)
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId,
      });
    }

    // Create test API key (this will be stored in the emulator)
    console.log('Creating API key...');
    const {apiKey, keyId} = await createAPIKey(
      TEST_EXPERIMENTER_ID,
      'Test API Key',
      [APIKeyPermission.READ, APIKeyPermission.WRITE],
    );
    testAPIKey = apiKey;
    // Verify the key can be validated (this uses admin SDK internally)
    console.log('Verifying API key...');
    const {valid, data} = await verifyAPIKey(apiKey);
    console.log('API key valid:', valid);
    if (!valid || !data) {
      throw new Error('API key verification failed');
    }

    // Create test Express app
    testApp = createTestAPIApp();
  });

  afterAll(async () => {
    // Cleanup test environment
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear experiments but keep API keys
    // We need to keep the API key that was created in beforeAll
    for (const expId of createdExperimentIds) {
      try {
        const expRef = firestore.collection(EXPERIMENTS_COLLECTION).doc(expId);
        await expRef.delete();
        // Also delete subcollections
        const stages = await expRef.collection('stages').get();
        for (const stage of stages.docs) {
          await stage.ref.delete();
        }
      } catch (error) {
        console.error('Error cleaning up experiment:', expId, error);
      }
    }
    createdExperimentIds.length = 0;
  });

  /**
   * Helper function to serialize data for Firestore
   * Converts Timestamp objects to plain objects
   */
  function serializeForFirestore<T>(data: T): T {
    return JSON.parse(JSON.stringify(data)) as T;
  }

  /**
   * Helper function to create an experiment using the template system
   * (mimics the writeExperiment endpoint behavior)
   */
  async function createExperimentViaTemplate(
    template: ExperimentTemplate,
  ): Promise<string> {
    const experimentConfig = createExperimentConfig(
      template.stageConfigs,
      template.experiment,
    );

    // Override creator to test user
    experimentConfig.metadata.creator = TEST_EXPERIMENTER_ID;

    const document = firestore
      .collection(EXPERIMENTS_COLLECTION)
      .doc(experimentConfig.id);

    // Write experiment directly (serialize to remove Timestamp objects)
    await document.set(serializeForFirestore(experimentConfig));

    // Add stages subcollection
    for (const stage of template.stageConfigs) {
      await document
        .collection('stages')
        .doc(stage.id)
        .set(serializeForFirestore(stage));
    }

    // Add agent mediators if any
    for (const agent of template.agentMediators) {
      const doc = document.collection('agentMediators').doc(agent.persona.id);
      await doc.set(serializeForFirestore(agent.persona));
      for (const prompt of Object.values(agent.promptMap)) {
        await doc
          .collection('prompts')
          .doc(prompt.id)
          .set(serializeForFirestore(prompt));
      }
    }

    // Add agent participants if any
    for (const agent of template.agentParticipants) {
      const doc = document
        .collection('agentParticipants')
        .doc(agent.persona.id);
      await doc.set(serializeForFirestore(agent.persona));
      for (const prompt of Object.values(agent.promptMap)) {
        await doc
          .collection('prompts')
          .doc(prompt.id)
          .set(serializeForFirestore(prompt));
      }
    }

    createdExperimentIds.push(experimentConfig.id);
    return experimentConfig.id;
  }

  /**
   * Helper function to create an experiment using the API
   * Makes actual HTTP POST request to the REST API endpoint
   */
  async function createExperimentViaAPI(
    name: string,
    description: string,
    stages: StageConfig[],
    prolificRedirectCode?: string,
  ): Promise<string> {
    // Prepare request body matching API schema
    // Serialize stages to JSON (removes Timestamps, like a real API client would send)
    const requestBody: {
      name: string;
      description: string;
      stages: StageConfig[];
      prolificRedirectCode?: string;
    } = {
      name,
      description,
      stages: JSON.parse(JSON.stringify(stages)) as StageConfig[],
    };

    if (prolificRedirectCode) {
      requestBody.prolificRedirectCode = prolificRedirectCode;
    }

    // Make actual HTTP POST request to API
    const response = await request(testApp)
      .post('/v1/experiments')
      .set('Authorization', `Bearer ${testAPIKey}`)
      .send(requestBody);

    // Assert successful creation
    if (response.status !== 201) {
      console.error('API request failed:', response.status, response.body);
    }
    expect(response.status).toBe(201);

    // Extract experiment ID from response
    const experimentId = response.body.id;
    createdExperimentIds.push(experimentId);
    return experimentId;
  }

  /**
   * Helper function to fetch experiment from Firestore including stages
   */
  async function getExperimentWithStages(
    experimentId: string,
  ): Promise<{experiment: Experiment; stages: StageConfig[]}> {
    const experimentDoc = await firestore
      .collection(EXPERIMENTS_COLLECTION)
      .doc(experimentId)
      .get();

    const experiment = experimentDoc.data() as Experiment;

    const stagesSnapshot = await firestore
      .collection(EXPERIMENTS_COLLECTION)
      .doc(experimentId)
      .collection('stages')
      .get();

    const stages = stagesSnapshot.docs.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc: any) => doc.data() as StageConfig,
    );

    return {experiment, stages};
  }

  /**
   * Helper function to normalize experiment for comparison
   * Removes ONLY fields that are expected to differ:
   * - Timestamps (dateCreated, dateModified)
   * - Auto-generated document IDs (experiment ID itself)
   * Everything else MUST match exactly, including explicitly set stage IDs
   */
  function normalizeExperimentForComparison(
    experiment: Experiment,
  ): Partial<Experiment> {
    const normalized = JSON.parse(JSON.stringify(experiment)) as Experiment;

    // Remove timestamp fields (these will naturally differ)
    if (normalized.metadata) {
      delete (normalized.metadata as Partial<typeof normalized.metadata>)
        .dateCreated;
      delete (normalized.metadata as Partial<typeof normalized.metadata>)
        .dateModified;
    }

    // Remove the experiment document ID (auto-generated, will differ)
    delete (normalized as Partial<Experiment>).id;

    return normalized;
  }

  /**
   * Normalize stage for comparison - timestamps only
   */
  function normalizeStageForComparison(stage: StageConfig): StageConfig {
    const normalized = JSON.parse(JSON.stringify(stage)) as StageConfig;
    // Stages have explicit IDs from templates, so we keep those
    // No timestamps in stage configs currently
    return normalized;
  }

  /**
   * Helper function to compare two experiments for structural equivalence
   * Compares everything EXCEPT timestamps and auto-generated document IDs
   */
  function compareExperiments(
    exp1: Experiment,
    stages1: StageConfig[],
    exp2: Experiment,
    stages2: StageConfig[],
  ): {
    equivalent: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    // Normalize for comparison (removes timestamps and doc IDs)
    const norm1 = normalizeExperimentForComparison(exp1);
    const norm2 = normalizeExperimentForComparison(exp2);

    // Deep comparison of experiment config (excluding normalized fields)
    const exp1Str = JSON.stringify(norm1, Object.keys(norm1).sort());
    const exp2Str = JSON.stringify(norm2, Object.keys(norm2).sort());

    if (exp1Str !== exp2Str) {
      // Provide more detailed differences
      if (norm1.metadata?.name !== norm2.metadata?.name) {
        differences.push(
          `Metadata name differs: "${norm1.metadata?.name}" vs "${norm2.metadata?.name}"`,
        );
      }
      if (norm1.metadata?.description !== norm2.metadata?.description) {
        differences.push(
          `Metadata description differs: "${norm1.metadata?.description}" vs "${norm2.metadata?.description}"`,
        );
      }
      if (norm1.metadata?.creator !== norm2.metadata?.creator) {
        differences.push(
          `Creator differs: "${norm1.metadata?.creator}" vs "${norm2.metadata?.creator}"`,
        );
      }
      if (norm1.versionId !== norm2.versionId) {
        differences.push(
          `Version ID differs: ${norm1.versionId} vs ${norm2.versionId}`,
        );
      }
      if (JSON.stringify(norm1.stageIds) !== JSON.stringify(norm2.stageIds)) {
        differences.push(
          `Stage IDs order differs: ${JSON.stringify(norm1.stageIds)} vs ${JSON.stringify(norm2.stageIds)}`,
        );
      }
      if (
        JSON.stringify(norm1.permissions) !== JSON.stringify(norm2.permissions)
      ) {
        differences.push('Permissions config differs');
      }
      if (
        JSON.stringify(norm1.defaultCohortConfig) !==
        JSON.stringify(norm2.defaultCohortConfig)
      ) {
        differences.push('Default cohort config differs');
      }
    }

    // Compare stages
    if (stages1.length !== stages2.length) {
      differences.push(
        `Stage count differs: ${stages1.length} vs ${stages2.length}`,
      );
    } else {
      // Stages should have explicit IDs from templates, so we compare by ID
      const stagesById1 = new Map(stages1.map((s) => [s.id, s]));
      const stagesById2 = new Map(stages2.map((s) => [s.id, s]));

      for (const [id, stage1] of stagesById1) {
        const stage2 = stagesById2.get(id);
        if (!stage2) {
          differences.push(`Stage ${id} missing in second experiment`);
          continue;
        }

        const normStage1 = normalizeStageForComparison(stage1);
        const normStage2 = normalizeStageForComparison(stage2);

        const stage1Str = JSON.stringify(
          normStage1,
          Object.keys(normStage1).sort(),
        );
        const stage2Str = JSON.stringify(
          normStage2,
          Object.keys(normStage2).sort(),
        );

        if (stage1Str !== stage2Str) {
          differences.push(
            `Stage ${id} ("${stage1.name}") configuration differs`,
          );
        }
      }
    }

    return {
      equivalent: differences.length === 0,
      differences,
    };
  }

  // ============================================================================
  // Template Test Configuration
  // ============================================================================

  const TEMPLATES_TO_TEST = [
    getFlipCardExperimentTemplate,
    getQuickstartGroupChatTemplate,
    getPolicyExperimentTemplate,
    // Add more templates here as needed.
  ];

  describe.each(
    TEMPLATES_TO_TEST.map((getTemplate) => {
      const template = getTemplate();
      return {
        name: template.experiment.metadata.name,
        description: template.experiment.metadata.description,
        getTemplate,
      };
    }),
  )('$name Template Comparison', ({name, description, getTemplate}) => {
    it(`should create equivalent experiments via template and API (${description})`, async () => {
      // Get fresh template instance for this test
      const template = getTemplate();

      // Create experiment via template system
      const templateExperimentId = await createExperimentViaTemplate(template);

      // Create experiment via API with same configuration
      const apiExperimentId = await createExperimentViaAPI(
        template.experiment.metadata.name,
        template.experiment.metadata.description,
        template.stageConfigs,
      );

      // Fetch both experiments from Firestore
      const templateData = await getExperimentWithStages(templateExperimentId);
      const apiData = await getExperimentWithStages(apiExperimentId);

      // Compare experiments
      const comparison = compareExperiments(
        templateData.experiment,
        templateData.stages,
        apiData.experiment,
        apiData.stages,
      );

      // Assert equivalence
      expect(comparison.equivalent).toBe(true);
      if (!comparison.equivalent) {
        console.error(`[${name}] Differences found:`, comparison.differences);
      }
      expect(comparison.differences).toEqual([]);
    }, 30000); // 30 second timeout for Firestore operations
  });
});
