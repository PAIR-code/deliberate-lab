/**
 * Integration tests for API experiment creation vs traditional template-based creation
 *
 * These tests verify that experiments created via the REST API are equivalent
 * to experiments created using the traditional template system.
 *
 * This test requires a Firestore emulator running. Run via:
 * npm run test:firestore
 */

import {
  StageConfig,
  ExperimentTemplate,
  Experiment,
  ProlificConfig,
  Visibility,
  createExperimentConfig,
} from '@deliberation-lab/utils';
import {
  TestContext,
  setupTestContext,
  teardownTestContext,
  cleanupExperiment,
  createApiRequestHelper,
  serializeForFirestore,
  EXPERIMENTS_COLLECTION,
  TEST_EXPERIMENTER_ID,
} from './dl_api.test.utils';
import {DeliberateLabAPIKeyPermission} from '@deliberation-lab/utils';
import {createDeliberateLabAPIKey} from './dl_api_key.utils';

// Import actual experiment templates from frontend
import {getFlipCardExperimentTemplate} from '../../../frontend/src/shared/templates/flipcard';
import {getQuickstartGroupChatTemplate} from '../../../frontend/src/shared/templates/quickstart_group_chat';
import {getPolicyExperimentTemplate} from '../../../frontend/src/shared/templates/policy';

let ctx: TestContext;
let apiRequest: ReturnType<typeof createApiRequestHelper>;

describe('API Experiment Creation Integration Tests', () => {
  // Store created experiment IDs for cleanup
  const createdExperimentIds: string[] = [];

  beforeAll(async () => {
    ctx = await setupTestContext('Experiment Tests');
    apiRequest = createApiRequestHelper(ctx.baseUrl, ctx.apiKey);
  });

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  beforeEach(async () => {
    // Clear experiments from previous tests
    // Uses withSecurityRulesDisabled to bypass Firestore rules for cleanup
    for (const expId of createdExperimentIds) {
      await cleanupExperiment(ctx.testEnv, expId);
    }
    createdExperimentIds.length = 0;
  });

  /**
   * Helper function to create an experiment using the template system
   * (mimics the writeExperiment endpoint behavior which uses admin SDK)
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

    // Use withSecurityRulesDisabled to simulate admin SDK behavior
    // (the writeExperiment cloud function uses admin SDK which bypasses rules)
    await ctx.testEnv.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      const document = adminFirestore
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
    });

    createdExperimentIds.push(experimentConfig.id);
    return experimentConfig.id;
  }

  /**
   * Helper function to create an experiment using the API and track for cleanup
   */
  async function createTestExperiment(
    name: string,
    description: string,
    stages: StageConfig[],
    prolificConfig?: ProlificConfig,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      name,
      description,
      stages: JSON.parse(JSON.stringify(stages)),
    };
    if (prolificConfig) {
      body.prolificConfig = prolificConfig;
    }

    const response = await apiRequest('POST', '/v1/experiments', body);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('API request failed:', response.status, errorBody);
    }
    expect(response.status).toBe(201);

    const responseBody = await response.json();
    const experimentId = responseBody.experiment.id;
    createdExperimentIds.push(experimentId);
    return experimentId;
  }

  /**
   * Helper function to fetch experiment from Firestore including stages
   */
  async function getExperimentWithStages(
    experimentId: string,
  ): Promise<{experiment: Experiment; stages: StageConfig[]}> {
    const experimentDoc = await ctx.firestore
      .collection(EXPERIMENTS_COLLECTION)
      .doc(experimentId)
      .get();

    const experiment = experimentDoc.data() as Experiment;

    const stagesSnapshot = await ctx.firestore
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
      const apiExperimentId = await createTestExperiment(
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

  // ============================================================================
  // API CRUD Operations Tests
  // ============================================================================

  describe('API CRUD Operations', () => {
    describe('GET /v1/experiments (list)', () => {
      it('should return empty list when no experiments exist', async () => {
        const response = await apiRequest('GET', '/v1/experiments');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.experiments).toEqual([]);
        expect(data.total).toBe(0);
      });

      it('should return list of experiments created by the user', async () => {
        // Create two experiments
        const exp1Id = await createTestExperiment('Experiment 1', 'First', []);
        const exp2Id = await createTestExperiment('Experiment 2', 'Second', []);

        const response = await apiRequest('GET', '/v1/experiments');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.total).toBe(2);
        expect(data.experiments).toHaveLength(2);

        const ids = data.experiments.map((e: {id: string}) => e.id);
        expect(ids).toContain(exp1Id);
        expect(ids).toContain(exp2Id);
      });
    });

    describe('GET /v1/experiments/:id (get)', () => {
      it('should return 404 for non-existent experiment', async () => {
        const response = await apiRequest(
          'GET',
          '/v1/experiments/non-existent-id',
        );
        expect(response.status).toBe(404);
      });

      it('should return experiment with stages', async () => {
        const template = getFlipCardExperimentTemplate();
        const experimentId = await createTestExperiment(
          template.experiment.metadata.name,
          template.experiment.metadata.description,
          template.stageConfigs,
        );

        const response = await apiRequest(
          'GET',
          `/v1/experiments/${experimentId}`,
        );
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.experiment).toBeDefined();
        expect(data.experiment.id).toBe(experimentId);
        expect(data.stageMap).toBeDefined();
        expect(Object.keys(data.stageMap).length).toBe(
          template.stageConfigs.length,
        );
      });
    });

    describe('PUT /v1/experiments/:id (update)', () => {
      it('should return 404 for non-existent experiment', async () => {
        const response = await apiRequest(
          'PUT',
          '/v1/experiments/non-existent-id',
          {name: 'Updated Name'},
        );
        expect(response.status).toBe(404);
      });

      it('should update experiment metadata', async () => {
        const experimentId = await createTestExperiment(
          'Original Name',
          'Original Description',
          [],
        );

        const response = await apiRequest(
          'PUT',
          `/v1/experiments/${experimentId}`,
          {
            name: 'Updated Name',
            description: 'Updated Description',
          },
        );
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.updated).toBe(true);
        expect(data.id).toBe(experimentId);

        // Verify in Firestore
        const {experiment} = await getExperimentWithStages(experimentId);
        expect(experiment.metadata.name).toBe('Updated Name');
        expect(experiment.metadata.description).toBe('Updated Description');
      });

      it('should create experiment with prolificConfig', async () => {
        const prolificConfig: ProlificConfig = {
          enableProlificIntegration: true,
          defaultRedirectCode: 'ABC123',
          attentionFailRedirectCode: 'FAIL456',
          bootedRedirectCode: 'BOOT789',
        };

        const experimentId = await createTestExperiment(
          'Prolific Test',
          'Testing Prolific config',
          [],
          prolificConfig,
        );

        // Verify in Firestore
        const {experiment} = await getExperimentWithStages(experimentId);
        expect(experiment.prolificConfig).toEqual(prolificConfig);
      });

      it('should update experiment prolificConfig', async () => {
        const experimentId = await createTestExperiment(
          'Prolific Update Test',
          'Testing Prolific config update',
          [],
        );

        const newProlificConfig: ProlificConfig = {
          enableProlificIntegration: true,
          defaultRedirectCode: 'UPDATED123',
          attentionFailRedirectCode: 'UPDATED456',
          bootedRedirectCode: 'UPDATED789',
        };

        const response = await apiRequest(
          'PUT',
          `/v1/experiments/${experimentId}`,
          {prolificConfig: newProlificConfig},
        );
        expect(response.status).toBe(200);

        // Verify in Firestore
        const {experiment} = await getExperimentWithStages(experimentId);
        expect(experiment.prolificConfig).toEqual(newProlificConfig);
      });

      it('should update experiment stages', async () => {
        // Create experiment with initial stages from FlipCard template
        const template = getFlipCardExperimentTemplate();
        const experimentId = await createTestExperiment(
          'Stage Update Test',
          'Testing stage updates',
          template.stageConfigs,
        );

        // Verify initial stages
        const initialData = await getExperimentWithStages(experimentId);
        const initialStageCount = template.stageConfigs.length;
        expect(initialData.stages.length).toBe(initialStageCount);

        // Update with a subset of stages (first half only)
        // This tests both deletion of old stages and creation of new ones
        const newStages = JSON.parse(
          JSON.stringify(template.stageConfigs.slice(0, 2)),
        ) as StageConfig[];
        const removedStages = template.stageConfigs.slice(2);

        const response = await apiRequest(
          'PUT',
          `/v1/experiments/${experimentId}`,
          {stages: newStages},
        );
        if (response.status !== 200) {
          const errorBody = await response.text();
          console.error('Update stages failed:', response.status, errorBody);
        }
        expect(response.status).toBe(200);

        // Verify stages were updated
        const updatedData = await getExperimentWithStages(experimentId);
        expect(updatedData.stages.length).toBe(newStages.length);
        expect(updatedData.experiment.stageIds.length).toBe(newStages.length);

        // Verify kept stages still exist
        const keptStageIds = newStages.map((s) => s.id);
        for (const stageId of keptStageIds) {
          const stage = updatedData.stages.find((s) => s.id === stageId);
          expect(stage).toBeDefined();
        }

        // Verify removed stages are gone
        const removedStageIds = removedStages.map((s) => s.id);
        for (const stageId of removedStageIds) {
          const stage = updatedData.stages.find((s) => s.id === stageId);
          expect(stage).toBeUndefined();
        }
      });

      it('should update stages to empty array', async () => {
        const template = getFlipCardExperimentTemplate();
        const experimentId = await createTestExperiment(
          'Empty Stages Test',
          'Testing clearing stages',
          template.stageConfigs,
        );

        // Verify initial stages exist
        const initialData = await getExperimentWithStages(experimentId);
        expect(initialData.stages.length).toBeGreaterThan(0);

        // Update with empty stages
        const response = await apiRequest(
          'PUT',
          `/v1/experiments/${experimentId}`,
          {stages: []},
        );
        expect(response.status).toBe(200);

        // Verify stages were cleared
        const updatedData = await getExperimentWithStages(experimentId);
        expect(updatedData.stages.length).toBe(0);
        expect(updatedData.experiment.stageIds).toEqual([]);
      });
    });

    describe('DELETE /v1/experiments/:id (delete)', () => {
      it('should return 404 for non-existent experiment', async () => {
        const response = await apiRequest(
          'DELETE',
          '/v1/experiments/non-existent-id',
        );
        expect(response.status).toBe(404);
      });

      it('should delete experiment and all subcollections', async () => {
        const template = getFlipCardExperimentTemplate();
        const experimentId = await createTestExperiment(
          'Delete Test',
          'Testing deletion',
          template.stageConfigs,
        );

        // Verify experiment exists
        const initialData = await getExperimentWithStages(experimentId);
        expect(initialData.experiment).toBeDefined();
        expect(initialData.stages.length).toBeGreaterThan(0);

        // Delete experiment
        const response = await apiRequest(
          'DELETE',
          `/v1/experiments/${experimentId}`,
        );
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.deleted).toBe(true);
        expect(data.id).toBe(experimentId);

        // Verify experiment is gone from Firestore
        const experimentDoc = await ctx.firestore
          .collection(EXPERIMENTS_COLLECTION)
          .doc(experimentId)
          .get();
        expect(experimentDoc.exists).toBe(false);

        // Verify stages subcollection is also deleted
        const stagesSnapshot = await ctx.firestore
          .collection(EXPERIMENTS_COLLECTION)
          .doc(experimentId)
          .collection('stages')
          .get();
        expect(stagesSnapshot.empty).toBe(true);

        // Remove from cleanup list since it's already deleted
        const idx = createdExperimentIds.indexOf(experimentId);
        if (idx > -1) {
          createdExperimentIds.splice(idx, 1);
        }
      });
    });

    describe('GET /v1/experiments/:id/export (export)', () => {
      it('should return 404 for non-existent experiment', async () => {
        const response = await apiRequest(
          'GET',
          '/v1/experiments/non-existent-id/export',
        );
        expect(response.status).toBe(404);
      });

      it('should export experiment data structure', async () => {
        const template = getFlipCardExperimentTemplate();
        const experimentId = await createTestExperiment(
          'Export Test',
          'Testing export',
          template.stageConfigs,
        );

        const response = await apiRequest(
          'GET',
          `/v1/experiments/${experimentId}/export`,
        );
        expect(response.status).toBe(200);

        const data = await response.json();

        // Verify ExperimentDownload structure
        expect(data.experiment).toBeDefined();
        expect(data.experiment.id).toBe(experimentId);
        expect(data.stageMap).toBeDefined();
        expect(Object.keys(data.stageMap).length).toBe(
          template.stageConfigs.length,
        );

        // These should exist but be empty for a new experiment
        expect(data.participantMap).toBeDefined();
        expect(data.cohortMap).toBeDefined();
        expect(data.alerts).toBeDefined();
      });
    });
  });

  describe('Fork Experiment', () => {
    it('should fork an experiment with default name', async () => {
      const template = getFlipCardExperimentTemplate();

      // Create original experiment
      const originalId = await createTestExperiment(
        'Original Experiment',
        'Test description',
        template.stageConfigs,
      );

      // Fork the experiment
      const response = await apiRequest(
        'POST',
        `/v1/experiments/${originalId}/fork`,
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.experiment).toBeDefined();
      expect(data.experiment.id).toBeDefined();
      expect(data.experiment.id).not.toBe(originalId);
      expect(data.sourceExperimentId).toBe(originalId);
      expect(data.experiment.metadata.name).toBe('Copy of Original Experiment');

      // Track for cleanup
      createdExperimentIds.push(data.experiment.id);

      // Verify stages were copied
      const {stages} = await getExperimentWithStages(data.experiment.id);
      expect(stages.length).toBe(template.stageConfigs.length);
    });

    it('should fork an experiment with custom name', async () => {
      const template = getFlipCardExperimentTemplate();

      // Create original experiment
      const originalId = await createTestExperiment(
        'Original Experiment',
        'Test description',
        template.stageConfigs,
      );

      // Fork with custom name
      const response = await apiRequest(
        'POST',
        `/v1/experiments/${originalId}/fork`,
        {
          name: 'My Custom Fork',
        },
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.experiment.metadata.name).toBe('My Custom Fork');

      // Track for cleanup
      createdExperimentIds.push(data.experiment.id);
    });

    it('should return 404 for non-existent experiment', async () => {
      const response = await apiRequest(
        'POST',
        '/v1/experiments/nonexistent123/fork',
      );
      expect(response.status).toBe(404);
    });

    it('should return 403 when forking private experiment owned by another user', async () => {
      const template = getFlipCardExperimentTemplate();

      // Create experiment owned by the main test user
      const originalId = await createTestExperiment(
        'Private Experiment',
        'Test description',
        template.stageConfigs,
      );

      // Create a second API key for a different user
      const otherExperimenterId = 'other-user@example.com';
      const {apiKey: otherApiKey} = await createDeliberateLabAPIKey(
        otherExperimenterId,
        'Other User API Key',
        [
          DeliberateLabAPIKeyPermission.READ,
          DeliberateLabAPIKeyPermission.WRITE,
        ],
      );
      const otherUserRequest = createApiRequestHelper(ctx.baseUrl, otherApiKey);

      // Try to fork with the other user - should fail since experiment is private
      // (default visibility is not PUBLIC)
      const response = await otherUserRequest(
        'POST',
        `/v1/experiments/${originalId}/fork`,
      );
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toContain('Cannot fork this experiment');
    });

    it('should allow forking a PUBLIC experiment by another user', async () => {
      const template = getFlipCardExperimentTemplate();

      // Create experiment owned by the main test user
      const originalId = await createTestExperiment(
        'Public Experiment',
        'Test description',
        template.stageConfigs,
      );

      // Update experiment to be PUBLIC using admin access
      await ctx.testEnv.withSecurityRulesDisabled(async (context) => {
        const adminFirestore = context.firestore();
        await adminFirestore
          .collection(EXPERIMENTS_COLLECTION)
          .doc(originalId)
          .update({'permissions.visibility': Visibility.PUBLIC});
      });

      // Create a second API key for a different user
      const otherExperimenterId = 'other-user@example.com';
      const {apiKey: otherApiKey} = await createDeliberateLabAPIKey(
        otherExperimenterId,
        'Other User API Key',
        [
          DeliberateLabAPIKeyPermission.READ,
          DeliberateLabAPIKeyPermission.WRITE,
        ],
      );
      const otherUserRequest = createApiRequestHelper(ctx.baseUrl, otherApiKey);

      // Fork with the other user - should succeed since experiment is PUBLIC
      const response = await otherUserRequest(
        'POST',
        `/v1/experiments/${originalId}/fork`,
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.experiment).toBeDefined();
      expect(data.experiment.id).not.toBe(originalId);
      expect(data.sourceExperimentId).toBe(originalId);
      expect(data.experiment.metadata.name).toBe('Copy of Public Experiment');

      // The forked experiment should be owned by the other user
      expect(data.experiment.metadata.creator).toBe(otherExperimenterId);

      // Track for cleanup
      createdExperimentIds.push(data.experiment.id);
    });

    it('should copy all stages in correct order', async () => {
      const template = getPolicyExperimentTemplate();

      // Create original experiment
      const originalId = await createTestExperiment(
        'Policy Experiment',
        'Test description',
        template.stageConfigs,
      );

      // Fork the experiment
      const response = await apiRequest(
        'POST',
        `/v1/experiments/${originalId}/fork`,
      );
      expect(response.status).toBe(201);

      const data = await response.json();
      createdExperimentIds.push(data.experiment.id);

      // Verify stage IDs match and are in same order
      const originalExp = await getExperimentWithStages(originalId);
      const forkedExp = await getExperimentWithStages(data.experiment.id);

      expect(forkedExp.experiment.stageIds).toEqual(
        originalExp.experiment.stageIds,
      );

      // Verify stage content matches
      for (let i = 0; i < originalExp.stages.length; i++) {
        const origStage = normalizeStageForComparison(originalExp.stages[i]);
        const forkStage = normalizeStageForComparison(forkedExp.stages[i]);
        expect(forkStage).toEqual(origStage);
      }
    });
  });
});
