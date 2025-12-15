/**
 * Integration tests for CohortDefinition and individual cohort routing.
 *
 * This test requires a Firestore emulator running. Run via:
 * npm run test:firestore
 */

import {app} from './app';
import {Timestamp} from 'firebase-admin/firestore';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  CohortConfig,
  createStaticVariableConfig,
  createCohortConfig,
  createMetadataConfig,
  createParticipantProfileExtended,
  ParticipantProfileExtended,
  ParticipantStatus,
  VariableScope,
  VariableType,
  generateId,
} from '@deliberation-lab/utils';
import {createCohortInternal, findCohortByAlias} from './cohort.utils';
import {
  executeDirectTransfers,
  DirectTransferInstructions,
} from './participant.utils';

const firestore = app.firestore();

/**
 * Serialize data for Firestore (strips class instances to plain objects).
 */
function serializeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

/**
 * Helper to create a minimal experiment in Firestore for testing.
 */
async function createTestExperiment(
  experimentId: string,
  variableConfigs: ReturnType<typeof createStaticVariableConfig>[] = [],
): Promise<void> {
  await firestore
    .collection('experiments')
    .doc(experimentId)
    .set({
      id: experimentId,
      metadata: {name: 'Test Experiment'},
      variableConfigs: serializeForFirestore(variableConfigs),
      stageIds: [],
      defaultCohortConfig: {},
    });
}

/**
 * Helper to create a CohortConfig matching the production pattern.
 * Uses createCohortConfig from utils but overrides timestamps with Admin SDK
 * Timestamps (same pattern as participant.utils.ts and cohorts.dl_api.ts).
 */
function createTestCohortConfig(
  id: string,
  name: string,
  alias?: string,
): CohortConfig {
  const timestamp = Timestamp.now();
  return createCohortConfig({
    id,
    alias,
    metadata: {
      ...createMetadataConfig({name}),
      dateCreated: timestamp,
      dateModified: timestamp,
    },
  });
}

/**
 * Helper to create a participant in Firestore for testing.
 * Uses createParticipantProfileExtended which has null timestamps (avoids SDK issues).
 */
async function createTestParticipant(
  experimentId: string,
  participantId: string,
  cohortId: string,
  stageId: string = '',
): Promise<ParticipantProfileExtended> {
  const participant = createParticipantProfileExtended({
    privateId: participantId,
    publicId: `pub-${participantId}`,
    currentCohortId: cohortId,
    currentStageId: stageId,
    currentStatus: ParticipantStatus.IN_PROGRESS,
  });

  await firestore
    .collection(`experiments/${experimentId}/participants`)
    .doc(participantId)
    .set(participant);

  return participant;
}

describe('Cohort Definitions Integration Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-deliberate-lab',
      firestore: process.env.FIRESTORE_EMULATOR_HOST
        ? undefined
        : {
            host: 'localhost',
            port: 8081,
          },
    });

    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('createCohortInternal with alias and cohortValues', () => {
    it('should create cohort with alias and apply cohortValues', async () => {
      const experimentId = generateId();
      const cohortId = generateId(true);
      const variableConfigs = [
        createStaticVariableConfig({
          scope: VariableScope.COHORT,
          definition: {
            name: 'treatment',
            description: 'Treatment condition',
            schema: VariableType.STRING,
          },
          value: JSON.stringify('control'),
          cohortValues: {
            'arm-pro-ai': JSON.stringify('pro_ai_treatment'),
          },
        }),
      ];

      await createTestExperiment(experimentId, variableConfigs);

      const cohortConfig = createTestCohortConfig(
        cohortId,
        'Pro-AI Cohort',
        'arm-pro-ai',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });

      // Verify cohort was created
      const cohortDoc = await firestore
        .collection(`experiments/${experimentId}/cohorts`)
        .doc(cohortId)
        .get();
      expect(cohortDoc.exists).toBe(true);

      const savedCohort = cohortDoc.data() as CohortConfig;
      expect(savedCohort.alias).toBe('arm-pro-ai');

      // Verify cohort-specific value was applied
      expect(savedCohort.variableMap?.treatment).toBe(
        JSON.stringify('pro_ai_treatment'),
      );
    });

    it('should use default value when alias not in cohortValues', async () => {
      const experimentId = generateId();
      const cohortId = generateId(true);
      const variableConfigs = [
        createStaticVariableConfig({
          scope: VariableScope.COHORT,
          definition: {
            name: 'treatment',
            description: 'Treatment condition',
            schema: VariableType.STRING,
          },
          value: JSON.stringify('default_treatment'),
          cohortValues: {
            'arm-other': JSON.stringify('other_treatment'),
          },
        }),
      ];

      await createTestExperiment(experimentId, variableConfigs);

      const cohortConfig = createTestCohortConfig(
        cohortId,
        'Cohort Not In Map',
        'arm-not-in-map',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });

      const cohortDoc = await firestore
        .collection(`experiments/${experimentId}/cohorts`)
        .doc(cohortId)
        .get();

      const savedCohort = cohortDoc.data() as CohortConfig;
      // Should use default value since alias not in cohortValues
      expect(savedCohort.variableMap?.treatment).toBe(
        JSON.stringify('default_treatment'),
      );
    });

    it('should work without alias (regular cohort)', async () => {
      const experimentId = generateId();
      const cohortId = generateId(true);
      const variableConfigs = [
        createStaticVariableConfig({
          scope: VariableScope.COHORT,
          definition: {
            name: 'treatment',
            description: 'Treatment condition',
            schema: VariableType.STRING,
          },
          value: JSON.stringify('default_treatment'),
          cohortValues: {
            'arm-a': JSON.stringify('treatment_a'),
          },
        }),
      ];

      await createTestExperiment(experimentId, variableConfigs);

      // No alias - regular cohort
      const cohortConfig = createTestCohortConfig(cohortId, 'Regular Cohort');

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });

      const cohortDoc = await firestore
        .collection(`experiments/${experimentId}/cohorts`)
        .doc(cohortId)
        .get();

      const savedCohort = cohortDoc.data() as CohortConfig;
      // Should use default value since no alias
      expect(savedCohort.variableMap?.treatment).toBe(
        JSON.stringify('default_treatment'),
      );
    });
  });

  describe('findCohortByAlias', () => {
    it('should find cohort by alias', async () => {
      const experimentId = generateId();
      const cohortId = generateId(true);
      await createTestExperiment(experimentId);

      const cohortConfig = createTestCohortConfig(
        cohortId,
        'Find Me Cohort',
        'findme-alias',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });

      const foundCohort = await findCohortByAlias(experimentId, 'findme-alias');

      expect(foundCohort).not.toBeNull();
      expect(foundCohort!.alias).toBe('findme-alias');
      expect(foundCohort!.id).toBe(cohortId);
    });

    it('should return null for non-existent alias', async () => {
      const experimentId = generateId();
      const cohortId = generateId(true);
      await createTestExperiment(experimentId);

      const cohortConfig = createTestCohortConfig(
        cohortId,
        'Existing Cohort',
        'existing-alias',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });

      const foundCohort = await findCohortByAlias(
        experimentId,
        'non-existent-alias',
      );

      expect(foundCohort).toBeNull();
    });

    it('should return null when no cohorts exist', async () => {
      const experimentId = generateId();
      await createTestExperiment(experimentId);

      const foundCohort = await findCohortByAlias(experimentId, 'any-alias');

      expect(foundCohort).toBeNull();
    });
  });

  describe('multiple cohorts with different aliases', () => {
    it('should apply correct cohortValues to each cohort based on alias', async () => {
      const experimentId = generateId();

      // Variable config with alias keys
      const variableConfigs = [
        createStaticVariableConfig({
          scope: VariableScope.COHORT,
          definition: {
            name: 'agent_persona',
            description: 'Agent persona',
            schema: VariableType.STRING,
          },
          value: JSON.stringify('default_persona'),
          cohortValues: {
            'arm-enthusiast': JSON.stringify('enthusiast_persona'),
            'arm-skeptic': JSON.stringify('skeptic_persona'),
          },
        }),
      ];

      await createTestExperiment(experimentId, variableConfigs);

      // Create two cohorts with different aliases
      const enthusiastCohortId = generateId(true);
      const skepticCohortId = generateId(true);

      const enthusiastCohort = createTestCohortConfig(
        enthusiastCohortId,
        'Enthusiast Cohort',
        'arm-enthusiast',
      );

      const skepticCohort = createTestCohortConfig(
        skepticCohortId,
        'Skeptic Cohort',
        'arm-skeptic',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, enthusiastCohort);
      });

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, skepticCohort);
      });

      // Verify each cohort got its correct value
      const enthDoc = await firestore
        .collection(`experiments/${experimentId}/cohorts`)
        .doc(enthusiastCohortId)
        .get();
      const skeptDoc = await firestore
        .collection(`experiments/${experimentId}/cohorts`)
        .doc(skepticCohortId)
        .get();

      const savedEnthusiast = enthDoc.data() as CohortConfig;
      const savedSkeptic = skeptDoc.data() as CohortConfig;

      expect(savedEnthusiast.variableMap?.agent_persona).toBe(
        JSON.stringify('enthusiast_persona'),
      );
      expect(savedSkeptic.variableMap?.agent_persona).toBe(
        JSON.stringify('skeptic_persona'),
      );
    });
  });

  describe('executeDirectTransfers', () => {
    it('should transfer a single participant to target cohort', async () => {
      const experimentId = generateId();
      const sourceCohortId = generateId(true);
      const targetCohortId = generateId(true);
      const participantId = generateId();

      // Create experiment with stage IDs (required for transfer)
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .set({
          id: experimentId,
          metadata: {name: 'Transfer Test Experiment'},
          variableConfigs: [],
          stageIds: ['stage-1', 'stage-2'],
          defaultCohortConfig: {},
        });

      // Create source and target cohorts
      const sourceCohort = createTestCohortConfig(
        sourceCohortId,
        'Source Cohort',
      );
      const targetCohort = createTestCohortConfig(
        targetCohortId,
        'Target Cohort',
        'target-alias',
      );

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, sourceCohort);
      });
      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, targetCohort);
      });

      // Create participant in source cohort
      await createTestParticipant(
        experimentId,
        participantId,
        sourceCohortId,
        'stage-1',
      );

      // Execute direct transfer
      const instructions: DirectTransferInstructions = {
        experimentId,
        targetCohortId,
        stageIds: ['stage-1', 'stage-2'],
        participantPrivateIds: [participantId],
      };

      await executeDirectTransfers(instructions);

      // Verify participant was transferred
      const participantDoc = await firestore
        .collection(`experiments/${experimentId}/participants`)
        .doc(participantId)
        .get();

      const updatedParticipant =
        participantDoc.data() as ParticipantProfileExtended;

      expect(updatedParticipant.currentCohortId).toBe(targetCohortId);
      expect(updatedParticipant.currentStatus).toBe(
        ParticipantStatus.IN_PROGRESS,
      );
      expect(updatedParticipant.transferCohortId).toBeNull();
      // Transfer timestamp should be recorded for source cohort
      expect(
        updatedParticipant.timestamps.cohortTransfers[sourceCohortId],
      ).toBeDefined();
    });

    it('should transfer multiple participants (group transfer)', async () => {
      const experimentId = generateId();
      const sourceCohortId = generateId(true);
      const targetCohortId = generateId(true);
      const participant1Id = generateId();
      const participant2Id = generateId();
      const participant3Id = generateId();

      // Create experiment
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .set({
          id: experimentId,
          metadata: {name: 'Group Transfer Test'},
          variableConfigs: [],
          stageIds: ['stage-1'],
          defaultCohortConfig: {},
        });

      // Create cohorts
      const sourceCohort = createTestCohortConfig(sourceCohortId, 'Source');
      const targetCohort = createTestCohortConfig(targetCohortId, 'Target');

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, sourceCohort);
      });
      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, targetCohort);
      });

      // Create 3 participants in source cohort
      await createTestParticipant(
        experimentId,
        participant1Id,
        sourceCohortId,
        'stage-1',
      );
      await createTestParticipant(
        experimentId,
        participant2Id,
        sourceCohortId,
        'stage-1',
      );
      await createTestParticipant(
        experimentId,
        participant3Id,
        sourceCohortId,
        'stage-1',
      );

      // Execute group transfer
      const instructions: DirectTransferInstructions = {
        experimentId,
        targetCohortId,
        stageIds: ['stage-1'],
        participantPrivateIds: [participant1Id, participant2Id, participant3Id],
      };

      await executeDirectTransfers(instructions);

      // Verify all participants were transferred
      const participantsSnapshot = await firestore
        .collection(`experiments/${experimentId}/participants`)
        .where('currentCohortId', '==', targetCohortId)
        .get();

      expect(participantsSnapshot.size).toBe(3);

      // Verify each participant individually
      for (const doc of participantsSnapshot.docs) {
        const participant = doc.data() as ParticipantProfileExtended;
        expect(participant.currentCohortId).toBe(targetCohortId);
        expect(participant.currentStatus).toBe(ParticipantStatus.IN_PROGRESS);
        expect(
          participant.timestamps.cohortTransfers[sourceCohortId],
        ).toBeDefined();
      }
    });

    it('should handle transfer when participant not found (skip gracefully)', async () => {
      const experimentId = generateId();
      const targetCohortId = generateId(true);

      // Create experiment without any participants
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .set({
          id: experimentId,
          metadata: {name: 'Missing Participant Test'},
          variableConfigs: [],
          stageIds: [],
          defaultCohortConfig: {},
        });

      // Create target cohort
      const targetCohort = createTestCohortConfig(targetCohortId, 'Target');
      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, targetCohort);
      });

      // Try to transfer non-existent participant - should not throw
      const instructions: DirectTransferInstructions = {
        experimentId,
        targetCohortId,
        stageIds: [],
        participantPrivateIds: ['non-existent-participant'],
      };

      // Should complete without error (logs warning and skips)
      await expect(executeDirectTransfers(instructions)).resolves.not.toThrow();
    });

    it('should execute transfers sequentially (one transaction per participant)', async () => {
      const experimentId = generateId();
      const sourceCohortId = generateId(true);
      const targetCohortId = generateId(true);
      const participant1Id = generateId();
      const participant2Id = generateId();

      // Create experiment
      await firestore
        .collection('experiments')
        .doc(experimentId)
        .set({
          id: experimentId,
          metadata: {name: 'Sequential Transfer Test'},
          variableConfigs: [],
          stageIds: ['stage-1'],
          defaultCohortConfig: {},
        });

      // Create cohorts
      const sourceCohort = createTestCohortConfig(sourceCohortId, 'Source');
      const targetCohort = createTestCohortConfig(targetCohortId, 'Target');

      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, sourceCohort);
      });
      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, targetCohort);
      });

      // Create participants
      await createTestParticipant(
        experimentId,
        participant1Id,
        sourceCohortId,
        'stage-1',
      );
      await createTestParticipant(
        experimentId,
        participant2Id,
        sourceCohortId,
        'stage-1',
      );

      // Execute transfers
      const instructions: DirectTransferInstructions = {
        experimentId,
        targetCohortId,
        stageIds: ['stage-1'],
        participantPrivateIds: [participant1Id, participant2Id],
      };

      await executeDirectTransfers(instructions);

      // Verify both transferred successfully
      // (If they weren't sequential, batch writes could cause conflicts)
      const p1Doc = await firestore
        .collection(`experiments/${experimentId}/participants`)
        .doc(participant1Id)
        .get();
      const p2Doc = await firestore
        .collection(`experiments/${experimentId}/participants`)
        .doc(participant2Id)
        .get();

      const p1 = p1Doc.data() as ParticipantProfileExtended;
      const p2 = p2Doc.data() as ParticipantProfileExtended;

      expect(p1.currentCohortId).toBe(targetCohortId);
      expect(p2.currentCohortId).toBe(targetCohortId);

      // Both should have transfer timestamps (proves both transactions completed)
      expect(p1.timestamps.cohortTransfers[sourceCohortId]).toBeDefined();
      expect(p2.timestamps.cohortTransfers[sourceCohortId]).toBeDefined();
    });
  });
});
