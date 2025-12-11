/**
 * Integration tests for Cohort API endpoints
 *
 * These tests verify that the cohort CRUD operations work correctly
 * through the REST API.
 *
 * This test requires a Firestore emulator running. Run via:
 * npm run test:firestore
 */

import {CohortConfig} from '@deliberation-lab/utils';
import {
  TestContext,
  setupTestContext,
  teardownTestContext,
  cleanupExperiment,
  createApiRequestHelper,
  createExperimentViaApi,
  createCohortViaApi,
  EXPERIMENTS_COLLECTION,
} from './dl_api.test.utils';

// Import a template for creating test experiments with stages
import {getFlipCardExperimentTemplate} from '../../../frontend/src/shared/templates/flipcard';

let ctx: TestContext;
let apiRequest: ReturnType<typeof createApiRequestHelper>;

describe('Cohort API Integration Tests', () => {
  // Store created experiment IDs for cleanup
  const createdExperimentIds: string[] = [];

  beforeAll(async () => {
    ctx = await setupTestContext('Cohort Tests');
    apiRequest = createApiRequestHelper(ctx.baseUrl, ctx.apiKey);
  });

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  beforeEach(async () => {
    // Clear experiments (and their cohorts) from previous tests
    // Uses withSecurityRulesDisabled to bypass Firestore rules for cleanup
    for (const expId of createdExperimentIds) {
      await cleanupExperiment(ctx.testEnv, expId);
    }
    createdExperimentIds.length = 0;
  });

  /**
   * Helper to create an experiment and track it for cleanup
   */
  async function createTestExperiment(
    name: string,
    stages: unknown[] = [],
  ): Promise<string> {
    const experimentId = await createExperimentViaApi(
      apiRequest,
      name,
      'Test experiment for cohort tests',
      stages as [],
    );
    createdExperimentIds.push(experimentId);
    return experimentId;
  }

  /**
   * Helper to get cohort from Firestore
   */
  async function getCohortFromFirestore(
    experimentId: string,
    cohortId: string,
  ): Promise<CohortConfig | null> {
    const cohortDoc = await ctx.firestore
      .collection(EXPERIMENTS_COLLECTION)
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId)
      .get();

    return cohortDoc.exists ? (cohortDoc.data() as CohortConfig) : null;
  }

  // ============================================================================
  // Cohort CRUD Tests
  // ============================================================================

  describe('GET /v1/experiments/:experimentId/cohorts (list)', () => {
    it('should return empty list when no cohorts exist', async () => {
      const experimentId = await createTestExperiment('Empty Cohort Test');

      const response = await apiRequest(
        'GET',
        `/v1/experiments/${experimentId}/cohorts`,
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.cohorts).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return list of cohorts for experiment', async () => {
      const experimentId = await createTestExperiment('List Cohorts Test');

      // Create two cohorts
      await createCohortViaApi(apiRequest, experimentId, 'Cohort A');
      await createCohortViaApi(apiRequest, experimentId, 'Cohort B');

      const response = await apiRequest(
        'GET',
        `/v1/experiments/${experimentId}/cohorts`,
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total).toBe(2);
      expect(data.cohorts).toHaveLength(2);

      const names = data.cohorts.map((c: CohortConfig) => c.metadata.name);
      expect(names).toContain('Cohort A');
      expect(names).toContain('Cohort B');
    });

    it('should return 404 for non-existent experiment', async () => {
      const response = await apiRequest(
        'GET',
        '/v1/experiments/non-existent-id/cohorts',
      );
      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/experiments/:experimentId/cohorts (create)', () => {
    it('should create a cohort with minimal config', async () => {
      const experimentId = await createTestExperiment('Create Cohort Test');

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          name: 'Test Cohort',
        },
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.cohort).toBeDefined();
      expect(data.cohort.metadata.name).toBe('Test Cohort');
      expect(data.cohort.id).toBeDefined();

      // Verify in Firestore
      const cohort = await getCohortFromFirestore(experimentId, data.cohort.id);
      expect(cohort).not.toBeNull();
      expect(cohort!.metadata.name).toBe('Test Cohort');
    });

    it('should create a cohort with description', async () => {
      const experimentId = await createTestExperiment(
        'Cohort Description Test',
      );

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          name: 'Described Cohort',
          description: 'This is a test cohort with a description',
        },
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.cohort.metadata.description).toBe(
        'This is a test cohort with a description',
      );
    });

    it('should create a cohort with custom participantConfig', async () => {
      const experimentId = await createTestExperiment(
        'Participant Config Test',
      );

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          name: 'Custom Config Cohort',
          participantConfig: {
            minParticipantsPerCohort: 5,
            maxParticipantsPerCohort: 10,
          },
        },
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.cohort.participantConfig.minParticipantsPerCohort).toBe(5);
      expect(data.cohort.participantConfig.maxParticipantsPerCohort).toBe(10);
    });

    it('should reject invalid participantConfig (min > max)', async () => {
      const experimentId = await createTestExperiment('Invalid Config Test');

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          name: 'Invalid Cohort',
          participantConfig: {
            minParticipantsPerCohort: 10,
            maxParticipantsPerCohort: 5,
          },
        },
      );
      expect(response.status).toBe(400);
    });

    it('should reject cohort creation without name', async () => {
      const experimentId = await createTestExperiment('No Name Test');

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          description: 'No name provided',
        },
      );
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent experiment', async () => {
      const response = await apiRequest(
        'POST',
        '/v1/experiments/non-existent-id/cohorts',
        {
          name: 'Orphan Cohort',
        },
      );
      expect(response.status).toBe(404);
    });

    it('should initialize stage unlock map for stages with minParticipants=0', async () => {
      // Create experiment with stages
      const template = getFlipCardExperimentTemplate();
      const experimentId = await createTestExperiment(
        'Stage Unlock Test',
        template.stageConfigs,
      );

      const response = await apiRequest(
        'POST',
        `/v1/experiments/${experimentId}/cohorts`,
        {
          name: 'Cohort with Stages',
        },
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      // Verify stageUnlockMap exists
      expect(data.cohort.stageUnlockMap).toBeDefined();
    });
  });

  describe('GET /v1/experiments/:experimentId/cohorts/:cohortId (get)', () => {
    it('should return a specific cohort', async () => {
      const experimentId = await createTestExperiment('Get Cohort Test');

      // Create a cohort
      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Get Me',
        {description: 'A cohort to retrieve'},
      );

      // Get the cohort
      const response = await apiRequest(
        'GET',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.cohort).toBeDefined();
      expect(data.cohort.id).toBe(cohortId);
      expect(data.cohort.metadata.name).toBe('Get Me');
      expect(data.participantCount).toBeDefined();
      expect(data.participantCount).toBe(0);
    });

    it('should return 404 for non-existent cohort', async () => {
      const experimentId = await createTestExperiment('Missing Cohort Test');

      const response = await apiRequest(
        'GET',
        `/v1/experiments/${experimentId}/cohorts/non-existent-cohort`,
      );
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent experiment', async () => {
      const response = await apiRequest(
        'GET',
        '/v1/experiments/non-existent-id/cohorts/some-cohort',
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /v1/experiments/:experimentId/cohorts/:cohortId (update)', () => {
    it('should update cohort name', async () => {
      const experimentId = await createTestExperiment('Update Name Test');

      // Create a cohort
      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Original Name',
      );

      // Update the cohort
      const response = await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
        {
          name: 'Updated Name',
        },
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.updated).toBe(true);
      expect(data.id).toBe(cohortId);

      // Verify in Firestore
      const cohort = await getCohortFromFirestore(experimentId, cohortId);
      expect(cohort!.metadata.name).toBe('Updated Name');
    });

    it('should update cohort description', async () => {
      const experimentId = await createTestExperiment(
        'Update Description Test',
      );

      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Description Test',
        {description: 'Original description'},
      );

      const response = await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
        {
          description: 'Updated description',
        },
      );
      expect(response.status).toBe(200);

      const cohort = await getCohortFromFirestore(experimentId, cohortId);
      expect(cohort!.metadata.description).toBe('Updated description');
    });

    it('should update cohort participantConfig', async () => {
      const experimentId = await createTestExperiment('Update Config Test');

      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Config Test',
        {
          participantConfig: {
            minParticipantsPerCohort: 1,
            maxParticipantsPerCohort: 5,
          },
        },
      );

      const response = await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
        {
          participantConfig: {
            minParticipantsPerCohort: 3,
            maxParticipantsPerCohort: 15,
          },
        },
      );
      expect(response.status).toBe(200);

      const cohort = await getCohortFromFirestore(experimentId, cohortId);
      expect(cohort!.participantConfig.minParticipantsPerCohort).toBe(3);
      expect(cohort!.participantConfig.maxParticipantsPerCohort).toBe(15);
    });

    it('should reject invalid participantConfig update (min > max)', async () => {
      const experimentId = await createTestExperiment('Invalid Update Test');

      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Valid Cohort',
        {
          participantConfig: {
            minParticipantsPerCohort: 1,
            maxParticipantsPerCohort: 10,
          },
        },
      );

      // Try to update with invalid config
      const response = await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
        {
          participantConfig: {
            minParticipantsPerCohort: 20,
            maxParticipantsPerCohort: 10,
          },
        },
      );
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent cohort', async () => {
      const experimentId = await createTestExperiment('Update Missing Test');

      const response = await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/non-existent-cohort`,
        {
          name: 'Updated Name',
        },
      );
      expect(response.status).toBe(404);
    });

    it('should update dateModified timestamp', async () => {
      const experimentId = await createTestExperiment('Timestamp Test');

      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'Timestamp Cohort',
      );

      // Wait a bit to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 100));

      await apiRequest(
        'PUT',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
        {
          name: 'Updated Timestamp Cohort',
        },
      );

      const cohort = await getCohortFromFirestore(experimentId, cohortId);
      // dateModified should be different from dateCreated
      expect(cohort!.metadata.dateModified).not.toEqual(
        cohort!.metadata.dateCreated,
      );
    });
  });

  describe('DELETE /v1/experiments/:experimentId/cohorts/:cohortId (delete)', () => {
    it('should delete a cohort', async () => {
      const experimentId = await createTestExperiment('Delete Cohort Test');

      // Create a cohort
      const cohortId = await createCohortViaApi(
        apiRequest,
        experimentId,
        'To Be Deleted',
      );

      // Verify it exists
      const beforeDelete = await getCohortFromFirestore(experimentId, cohortId);
      expect(beforeDelete).not.toBeNull();

      // Delete it
      const response = await apiRequest(
        'DELETE',
        `/v1/experiments/${experimentId}/cohorts/${cohortId}`,
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.deleted).toBe(true);
      expect(data.id).toBe(cohortId);

      // Verify it's gone
      const afterDelete = await getCohortFromFirestore(experimentId, cohortId);
      expect(afterDelete).toBeNull();
    });

    it('should return 404 for non-existent cohort', async () => {
      const experimentId = await createTestExperiment('Delete Missing Test');

      const response = await apiRequest(
        'DELETE',
        `/v1/experiments/${experimentId}/cohorts/non-existent-cohort`,
      );
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent experiment', async () => {
      const response = await apiRequest(
        'DELETE',
        '/v1/experiments/non-existent-id/cohorts/some-cohort',
      );
      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // Cross-experiment isolation tests
  // ============================================================================

  describe('Cross-experiment isolation', () => {
    it('should not list cohorts from other experiments', async () => {
      const exp1Id = await createTestExperiment('Experiment 1');
      const exp2Id = await createTestExperiment('Experiment 2');

      // Create cohort in exp1
      await createCohortViaApi(apiRequest, exp1Id, 'Exp1 Cohort');

      // Create cohort in exp2
      await createCohortViaApi(apiRequest, exp2Id, 'Exp2 Cohort');

      // List cohorts for exp1
      const response1 = await apiRequest(
        'GET',
        `/v1/experiments/${exp1Id}/cohorts`,
      );
      const data1 = await response1.json();
      expect(data1.total).toBe(1);
      expect(data1.cohorts[0].metadata.name).toBe('Exp1 Cohort');

      // List cohorts for exp2
      const response2 = await apiRequest(
        'GET',
        `/v1/experiments/${exp2Id}/cohorts`,
      );
      const data2 = await response2.json();
      expect(data2.total).toBe(1);
      expect(data2.cohorts[0].metadata.name).toBe('Exp2 Cohort');
    });

    it('should not allow accessing cohort from wrong experiment', async () => {
      const exp1Id = await createTestExperiment('Experiment A');
      const exp2Id = await createTestExperiment('Experiment B');

      // Create cohort in exp1
      const cohortId = await createCohortViaApi(
        apiRequest,
        exp1Id,
        'Exp A Cohort',
      );

      // Try to access it via exp2
      const response = await apiRequest(
        'GET',
        `/v1/experiments/${exp2Id}/cohorts/${cohortId}`,
      );
      expect(response.status).toBe(404);
    });
  });
});
