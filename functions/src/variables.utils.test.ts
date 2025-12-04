// This test requires a Firestore emulator running. Run via:
// npm run test:firestore
// Or manually:
// FIRESTORE_EMULATOR_HOST="localhost:8080" npx jest src/variables.utils.test.ts

// Set project ID before importing firebase-admin
if (!process.env.GCLOUD_PROJECT) {
  process.env.GCLOUD_PROJECT = 'demo-deliberate-lab';
}

import * as admin from 'firebase-admin';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  BalanceAcross,
  BalanceStrategy,
  createBalancedAssignmentVariableConfig,
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
  createParticipantProfileExtended,
  ParticipantStatus,
  SeedStrategy,
  VariableScope,
  VariableType,
} from '@deliberation-lab/utils';
import {generateVariablesForScope} from './variables.utils';

let mockFirestore: FirebaseFirestore.Firestore;

jest.mock('./app', () => ({
  app: {
    firestore: () => mockFirestore,
  },
}));

describe('generateVariablesForScope', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const projectId = process.env.GCLOUD_PROJECT || 'demo-deliberate-lab';

    // Initialize test environment for cleanup utilities
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: process.env.FIRESTORE_EMULATOR_HOST
        ? undefined
        : {
            host: 'localhost',
            port: 8080,
          },
    });

    // Initialize Firebase Admin SDK - this connects to the emulator
    // via FIRESTORE_EMULATOR_HOST environment variable and has full
    // Firestore API support including .count()
    if (!admin.apps.length) {
      admin.initializeApp({projectId});
    }
    mockFirestore = admin.firestore();
    mockFirestore.settings({ignoreUndefinedProperties: true});
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('static variables', () => {
    it('should generate static variables for matching scope', async () => {
      const config = createStaticVariableConfig({
        scope: VariableScope.EXPERIMENT,
        definition: {
          name: 'greeting',
          description: 'A greeting message',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('Hello, World!'),
      });

      const result = await generateVariablesForScope([config], {
        scope: VariableScope.EXPERIMENT,
        experimentId: 'exp-1',
      });

      expect(result['greeting']).toBe(JSON.stringify('Hello, World!'));
    });

    it('should skip variables with non-matching scope', async () => {
      const config = createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'greeting',
          description: 'A greeting message',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('Hello!'),
      });

      const result = await generateVariablesForScope([config], {
        scope: VariableScope.EXPERIMENT,
        experimentId: 'exp-1',
      });

      expect(result['greeting']).toBeUndefined();
    });
  });

  describe('random permutation variables', () => {
    it('should generate random permutation variables', async () => {
      const config = createRandomPermutationVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'items',
          description: 'Shuffled items',
          schema: VariableType.array(VariableType.STRING),
        },
        values: [JSON.stringify('A'), JSON.stringify('B'), JSON.stringify('C')],
        numToSelect: 2,
        expandListToSeparateVariables: true,
        shuffleConfig: {
          shuffle: false,
          seed: SeedStrategy.COHORT,
          customSeed: '',
        },
      });

      const result = await generateVariablesForScope([config], {
        scope: VariableScope.COHORT,
        experimentId: 'exp-1',
        cohortId: 'cohort-1',
      });

      expect(result['items_1']).toBe(JSON.stringify('A'));
      expect(result['items_2']).toBe(JSON.stringify('B'));
      expect(result['items_3']).toBeUndefined();
    });
  });

  describe('balanced assignment variables', () => {
    const experimentId = 'exp-balanced';
    const cohortId = 'cohort-balanced';

    it('should assign using ROUND_ROBIN strategy based on participant count', async () => {
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'condition',
          description: 'Experimental condition',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('control'), JSON.stringify('treatment')],
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      // No participants yet - should get first value (index 0)
      const result1 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'p1',
      });
      expect(result1['condition']).toBe(JSON.stringify('control'));

      // Add a participant to Firestore
      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('p1')
        .set(
          createParticipantProfileExtended({
            privateId: 'p1',
            publicId: 'pub1',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
        );

      // Now with 1 participant - should get second value (index 1)
      const result2 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'p2',
      });
      expect(result2['condition']).toBe(JSON.stringify('treatment'));

      // Add second participant
      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('p2')
        .set(
          createParticipantProfileExtended({
            privateId: 'p2',
            publicId: 'pub2',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
        );

      // Now with 2 participants - should wrap around to first value (index 0)
      const result3 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'p3',
      });
      expect(result3['condition']).toBe(JSON.stringify('control'));
    });

    it('should assign using LEAST_USED strategy', async () => {
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'group',
          description: 'Assigned group',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('A'), JSON.stringify('B'), JSON.stringify('C')],
        balanceStrategy: BalanceStrategy.LEAST_USED,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      // Add participants with existing assignments
      // 2 in group A, 1 in group B, 0 in group C
      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('existing1')
        .set({
          ...createParticipantProfileExtended({
            privateId: 'existing1',
            publicId: 'pub-e1',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
          variableMap: {group: JSON.stringify('A')},
        });

      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('existing2')
        .set({
          ...createParticipantProfileExtended({
            privateId: 'existing2',
            publicId: 'pub-e2',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
          variableMap: {group: JSON.stringify('A')},
        });

      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('existing3')
        .set({
          ...createParticipantProfileExtended({
            privateId: 'existing3',
            publicId: 'pub-e3',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
          variableMap: {group: JSON.stringify('B')},
        });

      // New participant should get 'C' (least used with 0 assignments)
      const result = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'new-participant',
      });
      expect(result['group']).toBe(JSON.stringify('C'));
    });

    it('should assign using RANDOM strategy with seeded randomization', async () => {
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'variant',
          description: 'Random variant',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('X'), JSON.stringify('Y'), JSON.stringify('Z')],
        balanceStrategy: BalanceStrategy.RANDOM,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      // Same participant ID should get same result (seeded)
      const result1 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'deterministic-id',
      });

      const result2 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId,
        participantId: 'deterministic-id',
      });

      expect(result1['variant']).toBe(result2['variant']);

      // Result should be one of the valid values
      const validValues = [
        JSON.stringify('X'),
        JSON.stringify('Y'),
        JSON.stringify('Z'),
      ];
      expect(validValues).toContain(result1['variant']);
    });

    it('should balance per-cohort when balanceAcross is COHORT', async () => {
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'arm',
          description: 'Study arm',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('arm1'), JSON.stringify('arm2')],
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.COHORT,
      });

      const cohortA = 'cohort-A';
      const cohortB = 'cohort-B';

      // Add 1 participant to cohort A
      await mockFirestore
        .collection(`experiments/${experimentId}/participants`)
        .doc('pA1')
        .set(
          createParticipantProfileExtended({
            privateId: 'pA1',
            publicId: 'pub-pA1',
            currentCohortId: cohortA,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
        );

      // Cohort A has 1 participant, so next gets index 1
      const resultA = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId: cohortA,
        participantId: 'pA2',
      });
      expect(resultA['arm']).toBe(JSON.stringify('arm2'));

      // Cohort B has 0 participants, so gets index 0
      const resultB = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId,
        cohortId: cohortB,
        participantId: 'pB1',
      });
      expect(resultB['arm']).toBe(JSON.stringify('arm1'));
    });

    it('should skip balanced assignment configs when generating for non-participant scope', async () => {
      // Balanced assignment configs are always PARTICIPANT scoped,
      // so they should be skipped when generating for COHORT or EXPERIMENT scope
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'condition',
          description: 'Condition',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('a'), JSON.stringify('b')],
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      // Try to generate at cohort scope - config should be filtered out by scope
      const result = await generateVariablesForScope([config], {
        scope: VariableScope.COHORT,
        experimentId,
        cohortId,
      });

      // Config has PARTICIPANT scope, so it's filtered out when requesting COHORT scope
      expect(result['condition']).toBeUndefined();
    });
  });

  describe('multiple variable configs', () => {
    it('should handle mixed variable types for same scope', async () => {
      const staticConfig = createStaticVariableConfig({
        scope: VariableScope.PARTICIPANT,
        definition: {
          name: 'welcome',
          description: 'Welcome message',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('Welcome!'),
      });

      const balancedConfig = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'condition',
          description: 'Condition',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('A'), JSON.stringify('B')],
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      const result = await generateVariablesForScope(
        [staticConfig, balancedConfig],
        {
          scope: VariableScope.PARTICIPANT,
          experimentId: 'exp-mixed',
          cohortId: 'cohort-mixed',
          participantId: 'p1',
        },
      );

      expect(result['welcome']).toBe(JSON.stringify('Welcome!'));
      expect(result['condition']).toBe(JSON.stringify('A'));
    });
  });
});
