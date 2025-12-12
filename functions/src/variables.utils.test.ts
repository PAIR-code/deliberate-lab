// This test requires a Firestore emulator running. Run via:
// npm run test:firestore

import {app} from './app';
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

const firestore = app.firestore();

describe('generateVariablesForScope', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // Initialize test environment for cleanup utilities
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-deliberate-lab',
      firestore: process.env.FIRESTORE_EMULATOR_HOST
        ? undefined
        : {
            host: 'localhost',
            port: 8081,
          },
    });

    // Clear any leftover data from previous test runs
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
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
      await firestore
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
      await firestore
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
      await firestore
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

    it('should assign using ROUND_ROBIN with weights', async () => {
      // Weights [2, 1] means: first 2 participants get 'A', next 1 gets 'B', repeat
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'weighted_condition',
          description: 'Weighted condition',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('A'), JSON.stringify('B')],
        weights: [2, 1], // 2:1 ratio - A should get ~67%, B should get ~33%
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      const expId = 'weighted-rr-exp';

      // Participant 0 (position 0 % 3 = 0, falls in [0,2) -> A)
      const result0 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId: expId,
        cohortId,
        participantId: 'wp0',
      });
      expect(result0['weighted_condition']).toBe(JSON.stringify('A'));

      // Add participant 0
      await firestore
        .collection(`experiments/${expId}/participants`)
        .doc('wp0')
        .set(
          createParticipantProfileExtended({
            privateId: 'wp0',
            publicId: 'pub-wp0',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
        );

      // Participant 1 (position 1 % 3 = 1, falls in [0,2) -> A)
      const result1 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId: expId,
        cohortId,
        participantId: 'wp1',
      });
      expect(result1['weighted_condition']).toBe(JSON.stringify('A'));

      // Add participant 1
      await firestore
        .collection(`experiments/${expId}/participants`)
        .doc('wp1')
        .set(
          createParticipantProfileExtended({
            privateId: 'wp1',
            publicId: 'pub-wp1',
            currentCohortId: cohortId,
            currentStatus: ParticipantStatus.IN_PROGRESS,
          }),
        );

      // Participant 2 (position 2 % 3 = 2, falls in [2,3) -> B)
      const result2 = await generateVariablesForScope([config], {
        scope: VariableScope.PARTICIPANT,
        experimentId: expId,
        cohortId,
        participantId: 'wp2',
      });
      expect(result2['weighted_condition']).toBe(JSON.stringify('B'));
    });

    it('should handle equal weights same as no weights', async () => {
      const configWithWeights = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'equal_weighted',
          description: 'Equal weighted',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('X'), JSON.stringify('Y')],
        weights: [1, 1], // Equal weights
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      const configNoWeights = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'no_weights',
          description: 'No weights',
          schema: VariableType.STRING,
        },
        values: [JSON.stringify('X'), JSON.stringify('Y')],
        // No weights specified
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      const expId = 'equal-weights-exp';

      // Both should give same result for first participant
      const resultWithWeights = await generateVariablesForScope(
        [configWithWeights],
        {
          scope: VariableScope.PARTICIPANT,
          experimentId: expId,
          cohortId,
          participantId: 'p1',
        },
      );

      const resultNoWeights = await generateVariablesForScope(
        [configNoWeights],
        {
          scope: VariableScope.PARTICIPANT,
          experimentId: expId,
          cohortId,
          participantId: 'p1',
        },
      );

      // Both should get 'X' (first value, index 0)
      expect(resultWithWeights['equal_weighted']).toBe(JSON.stringify('X'));
      expect(resultNoWeights['no_weights']).toBe(JSON.stringify('X'));
    });
  });

  describe('statistical validation with 120 participants', () => {
    const experimentId = 'exp-statistical';
    const cohortId = 'cohort-statistical';

    // Test with 5 values and weights [5, 4, 3, 2, 1] = 15 total
    // 120 participants = 8 complete cycles
    // Expected counts: A=40 (33.3%), B=32 (26.7%), C=24 (20%), D=16 (13.3%), E=8 (6.7%)
    const values = ['A', 'B', 'C', 'D', 'E'];
    const weights = [5, 4, 3, 2, 1];
    const totalWeight = weights.reduce((sum, w) => sum + w, 0); // 15
    const numParticipants = 120;
    const expectedCounts: Record<string, number> = {};
    values.forEach((v, i) => {
      expectedCounts[v] = (weights[i] / totalWeight) * numParticipants;
    });

    it('should achieve exact weighted ratio with ROUND_ROBIN over 120 participants', async () => {
      const config = createBalancedAssignmentVariableConfig({
        definition: {
          name: 'rr_condition',
          description: 'Round robin condition',
          schema: VariableType.STRING,
        },
        values: values.map((v) => JSON.stringify(v)),
        weights,
        balanceStrategy: BalanceStrategy.ROUND_ROBIN,
        balanceAcross: BalanceAcross.EXPERIMENT,
      });

      const counts: Record<string, number> = {A: 0, B: 0, C: 0, D: 0, E: 0};

      // Simulate 120 participants joining sequentially
      for (let i = 0; i < numParticipants; i++) {
        const participantId = `rr-p${i}`;

        const result = await generateVariablesForScope([config], {
          scope: VariableScope.PARTICIPANT,
          experimentId,
          cohortId,
          participantId,
        });

        const value = JSON.parse(result['rr_condition']);
        counts[value]++;

        // Add participant to Firestore for next iteration's count
        await firestore
          .collection(`experiments/${experimentId}/participants`)
          .doc(participantId)
          .set(
            createParticipantProfileExtended({
              privateId: participantId,
              publicId: `pub-${participantId}`,
              currentCohortId: cohortId,
              currentStatus: ParticipantStatus.IN_PROGRESS,
            }),
          );
      }

      // ROUND_ROBIN should achieve exact ratio over full cycles
      // 120 participants with weights [5,4,3,2,1] = 8 complete cycles of 15
      // Expected: exactly A=40, B=32, C=24, D=16, E=8
      values.forEach((v) => {
        expect(counts[v]).toBe(expectedCounts[v]);
      });
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
