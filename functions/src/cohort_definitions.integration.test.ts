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
  ComparisonOperator,
  createCohortConfig,
  createCohortParticipantConfig,
  createConditionAutoTransferConfig,
  createGroupComposition,
  createMetadataConfig,
  createParticipantProfileExtended,
  createStaticVariableConfig,
  createSurveyStagePublicData,
  createTransferGroup,
  createTransferStage,
  ParticipantProfileExtended,
  ParticipantStatus,
  SurveyQuestionKind,
  TransferStageConfig,
  VariableScope,
  VariableType,
  generateId,
} from '@deliberation-lab/utils';
import {createCohortInternal, findCohortByAlias} from './cohort.utils';
import {
  executeDirectTransfers,
  DirectTransferInstructions,
  handleAutomaticTransfer,
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
  config: {
    variableConfigs?: ReturnType<typeof createStaticVariableConfig>[];
    stageIds?: string[];
  } = {},
): Promise<void> {
  await firestore
    .collection('experiments')
    .doc(experimentId)
    .set({
      id: experimentId,
      metadata: {name: 'Test Experiment'},
      variableConfigs: serializeForFirestore(config.variableConfigs ?? []),
      stageIds: config.stageIds ?? [],
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
  config: {
    stageId?: string;
    publicId?: string;
    connected?: boolean;
  } = {},
): Promise<ParticipantProfileExtended> {
  const participant = createParticipantProfileExtended({
    privateId: participantId,
    publicId: config.publicId ?? `pub-${participantId}`,
    currentCohortId: cohortId,
    currentStageId: config.stageId ?? '',
    currentStatus: ParticipantStatus.IN_PROGRESS,
  });
  // Set connected explicitly to simulate presence system state.
  // In prod, createParticipantProfileExtended creates humans as disconnected,
  // then the presence trigger updates connected=true when browser connects.
  // By the time someone reaches a transfer stage, they'd be connected.
  if (config.connected !== undefined) {
    participant.connected = config.connected;
  }

  await firestore
    .collection(`experiments/${experimentId}/participants`)
    .doc(participantId)
    .set(participant);

  return participant;
}

/**
 * Helper to create a transfer stage config in Firestore.
 */
async function createTestTransferStage(
  experimentId: string,
  stageConfig: TransferStageConfig,
): Promise<void> {
  await firestore
    .collection(`experiments/${experimentId}/stages`)
    .doc(stageConfig.id)
    .set(serializeForFirestore(stageConfig));
}

/**
 * Helper to set up survey public data with participant answers.
 */
async function createTestSurveyData(
  experimentId: string,
  cohortId: string,
  surveyStageId: string,
  participantAnswers: Record<
    string,
    Record<
      string,
      {kind: SurveyQuestionKind; value?: number; choiceId?: string}
    >
  >,
): Promise<void> {
  const surveyData = createSurveyStagePublicData(surveyStageId);

  for (const [publicId, answers] of Object.entries(participantAnswers)) {
    surveyData.participantAnswerMap[publicId] = {};
    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer.kind === SurveyQuestionKind.SCALE) {
        surveyData.participantAnswerMap[publicId][questionId] = {
          id: questionId,
          kind: SurveyQuestionKind.SCALE,
          value: answer.value!,
        };
      } else if (answer.kind === SurveyQuestionKind.MULTIPLE_CHOICE) {
        surveyData.participantAnswerMap[publicId][questionId] = {
          id: questionId,
          kind: SurveyQuestionKind.MULTIPLE_CHOICE,
          choiceId: answer.choiceId!,
        };
      }
    }
  }

  await firestore
    .collection(
      `experiments/${experimentId}/cohorts/${cohortId}/publicStageData`,
    )
    .doc(surveyStageId)
    .set(surveyData);
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

      await createTestExperiment(experimentId, {variableConfigs});

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

      await createTestExperiment(experimentId, {variableConfigs});

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

      await createTestExperiment(experimentId, {variableConfigs});

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

      await createTestExperiment(experimentId, {variableConfigs});

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
      await createTestParticipant(experimentId, participantId, sourceCohortId, {
        stageId: 'stage-1',
      });

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
        {stageId: 'stage-1'},
      );
      await createTestParticipant(
        experimentId,
        participant2Id,
        sourceCohortId,
        {stageId: 'stage-1'},
      );
      await createTestParticipant(
        experimentId,
        participant3Id,
        sourceCohortId,
        {stageId: 'stage-1'},
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
        {stageId: 'stage-1'},
      );
      await createTestParticipant(
        experimentId,
        participant2Id,
        sourceCohortId,
        {stageId: 'stage-1'},
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

  describe('Condition Auto-Transfer', () => {
    /**
     * Helper to create a cohort (used by condition tests).
     */
    async function createTestCohort(
      experimentId: string,
      cohortId: string,
      name: string,
    ): Promise<void> {
      const cohortConfig = createTestCohortConfig(cohortId, name);
      await firestore.runTransaction(async (transaction) => {
        await createCohortInternal(transaction, experimentId, cohortConfig);
      });
    }

    beforeEach(async () => {
      await testEnv.clearFirestore();
    });

    describe('Single composition entry (simple grouping)', () => {
      it('should wait until minCount is met before forming cohort', async () => {
        const experimentId = generateId();
        const cohortId = generateId(true);
        const surveyStageId = 'survey-stage';
        const transferStageId = 'transfer-stage';

        // Create experiment
        await createTestExperiment(experimentId, {
          stageIds: [surveyStageId, transferStageId],
        });
        await createTestCohort(experimentId, cohortId, 'Source Cohort');

        // Create transfer stage with single composition entry requiring 3 participants
        const transferStage = createTransferStage({
          id: transferStageId,
          autoTransferConfig: createConditionAutoTransferConfig({
            autoCohortParticipantConfig: createCohortParticipantConfig(),
            transferGroups: [
              createTransferGroup({
                name: 'High Scorers',
                composition: [
                  createGroupComposition({
                    id: 'high-score',
                    condition: {
                      id: 'cond-1',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                      value: 7,
                    },
                    minCount: 3,
                    maxCount: 5,
                  }),
                ],
              }),
            ],
          }),
        });
        await createTestTransferStage(experimentId, transferStage);

        // Create 2 participants with high scores (not enough yet)
        const p1 = await createTestParticipant(experimentId, 'p1', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p1',
          connected: true,
        });
        await createTestParticipant(experimentId, 'p2', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p2',
          connected: true,
        });

        // Set up survey answers
        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {q1: {kind: SurveyQuestionKind.SCALE, value: 8}},
          'pub-p2': {q1: {kind: SurveyQuestionKind.SCALE, value: 9}},
        });

        // Try to transfer with only 2 participants - should wait
        const result1 = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p1,
          );
        });

        expect(result1.response).toBeNull();
        expect(result1.directTransferInstructions).toBeNull();

        // Add third participant
        const p3 = await createTestParticipant(experimentId, 'p3', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p3',
          connected: true,
        });
        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {q1: {kind: SurveyQuestionKind.SCALE, value: 8}},
          'pub-p2': {q1: {kind: SurveyQuestionKind.SCALE, value: 9}},
          'pub-p3': {q1: {kind: SurveyQuestionKind.SCALE, value: 7}},
        });

        // Now should form cohort (TRANSFER_PENDING since no targetCohortAlias)
        const result2 = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p3,
          );
        });

        expect(result2.response).not.toBeNull();
        expect(result2.response?.currentStageId).toBe(transferStageId);
      });
    });

    describe('Multiple composition entries (mixed-composition)', () => {
      it('should wait until ALL composition entries meet minCount', async () => {
        const experimentId = generateId();
        const cohortId = generateId(true);
        const surveyStageId = 'survey-stage';
        const transferStageId = 'transfer-stage';

        await createTestExperiment(experimentId, {
          stageIds: [surveyStageId, transferStageId],
        });
        await createTestCohort(experimentId, cohortId, 'Source Cohort');

        // Create transfer stage requiring 2 high scorers AND 2 low scorers
        const transferStage = createTransferStage({
          id: transferStageId,
          autoTransferConfig: createConditionAutoTransferConfig({
            autoCohortParticipantConfig: createCohortParticipantConfig(),
            transferGroups: [
              createTransferGroup({
                name: 'Mixed Group',
                composition: [
                  createGroupComposition({
                    id: 'high-score',
                    condition: {
                      id: 'cond-high',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                      value: 7,
                    },
                    minCount: 2,
                    maxCount: 2,
                  }),
                  createGroupComposition({
                    id: 'low-score',
                    condition: {
                      id: 'cond-low',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.LESS_THAN,
                      value: 5,
                    },
                    minCount: 2,
                    maxCount: 2,
                  }),
                ],
              }),
            ],
          }),
        });
        await createTestTransferStage(experimentId, transferStage);

        // Create 2 high scorers but only 1 low scorer
        const p1 = await createTestParticipant(experimentId, 'p1', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p1',
          connected: true,
        });
        await createTestParticipant(experimentId, 'p2', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p2',
          connected: true,
        });
        await createTestParticipant(experimentId, 'p3', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p3',
          connected: true,
        });

        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {q1: {kind: SurveyQuestionKind.SCALE, value: 8}}, // high
          'pub-p2': {q1: {kind: SurveyQuestionKind.SCALE, value: 9}}, // high
          'pub-p3': {q1: {kind: SurveyQuestionKind.SCALE, value: 3}}, // low
        });

        // Should wait - have 2 high but only 1 low
        const result1 = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p1,
          );
        });

        expect(result1.response).toBeNull();

        // Add second low scorer
        const p4 = await createTestParticipant(experimentId, 'p4', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p4',
          connected: true,
        });
        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {q1: {kind: SurveyQuestionKind.SCALE, value: 8}},
          'pub-p2': {q1: {kind: SurveyQuestionKind.SCALE, value: 9}},
          'pub-p3': {q1: {kind: SurveyQuestionKind.SCALE, value: 3}},
          'pub-p4': {q1: {kind: SurveyQuestionKind.SCALE, value: 2}}, // low
        });

        // Now should form cohort
        const result2 = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p4,
          );
        });

        expect(result2.response).not.toBeNull();
      });

      it('should respect maxCount when forming cohort', async () => {
        const experimentId = generateId();
        const cohortId = generateId(true);
        const surveyStageId = 'survey-stage';
        const transferStageId = 'transfer-stage';

        await createTestExperiment(experimentId, {
          stageIds: [surveyStageId, transferStageId],
        });
        await createTestCohort(experimentId, cohortId, 'Source Cohort');

        // Create transfer stage: need 1-2 high, 1-2 low
        const transferStage = createTransferStage({
          id: transferStageId,
          autoTransferConfig: createConditionAutoTransferConfig({
            autoCohortParticipantConfig: createCohortParticipantConfig(),
            transferGroups: [
              createTransferGroup({
                name: 'Limited Group',
                composition: [
                  createGroupComposition({
                    id: 'high-score',
                    condition: {
                      id: 'cond-high',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                      value: 7,
                    },
                    minCount: 1,
                    maxCount: 2, // At most 2 high scorers
                  }),
                  createGroupComposition({
                    id: 'low-score',
                    condition: {
                      id: 'cond-low',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.LESS_THAN,
                      value: 5,
                    },
                    minCount: 1,
                    maxCount: 2, // At most 2 low scorers
                  }),
                ],
              }),
            ],
          }),
        });
        await createTestTransferStage(experimentId, transferStage);

        // Create 4 high scorers and 3 low scorers (more than maxCount)
        for (let i = 1; i <= 4; i++) {
          await createTestParticipant(experimentId, `high-${i}`, cohortId, {
            stageId: transferStageId,
            publicId: `pub-high-${i}`,
            connected: true,
          });
        }
        for (let i = 1; i <= 3; i++) {
          await createTestParticipant(experimentId, `low-${i}`, cohortId, {
            stageId: transferStageId,
            publicId: `pub-low-${i}`,
            connected: true,
          });
        }

        const answers: Record<
          string,
          Record<string, {kind: SurveyQuestionKind; value: number}>
        > = {};
        for (let i = 1; i <= 4; i++) {
          answers[`pub-high-${i}`] = {
            q1: {kind: SurveyQuestionKind.SCALE, value: 8 + i},
          };
        }
        for (let i = 1; i <= 3; i++) {
          answers[`pub-low-${i}`] = {
            q1: {kind: SurveyQuestionKind.SCALE, value: i},
          };
        }
        await createTestSurveyData(
          experimentId,
          cohortId,
          surveyStageId,
          answers,
        );

        // Trigger participant
        const triggerParticipant = await createTestParticipant(
          experimentId,
          'trigger',
          cohortId,
          {stageId: transferStageId, publicId: 'pub-trigger', connected: true},
        );
        answers['pub-trigger'] = {
          q1: {kind: SurveyQuestionKind.SCALE, value: 10},
        };
        await createTestSurveyData(
          experimentId,
          cohortId,
          surveyStageId,
          answers,
        );

        const result = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            triggerParticipant,
          );
        });

        // Should form cohort (TRANSFER_PENDING)
        expect(result.response).not.toBeNull();

        // Verify the number of participants marked for transfer
        const pendingParticipants = await firestore
          .collection(`experiments/${experimentId}/participants`)
          .where('currentStatus', '==', ParticipantStatus.TRANSFER_PENDING)
          .get();

        // Should be maxCount from each: 2 high + 2 low = 4 total
        expect(pendingParticipants.size).toBe(4);
      });
    });

    describe('Participant not matching any condition', () => {
      it('should not transfer participant who matches no conditions', async () => {
        const experimentId = generateId();
        const cohortId = generateId(true);
        const surveyStageId = 'survey-stage';
        const transferStageId = 'transfer-stage';

        await createTestExperiment(experimentId, {
          stageIds: [surveyStageId, transferStageId],
        });
        await createTestCohort(experimentId, cohortId, 'Source Cohort');

        // Require high score (>= 7)
        const transferStage = createTransferStage({
          id: transferStageId,
          autoTransferConfig: createConditionAutoTransferConfig({
            autoCohortParticipantConfig: createCohortParticipantConfig(),
            transferGroups: [
              createTransferGroup({
                name: 'High Scorers Only',
                composition: [
                  createGroupComposition({
                    id: 'high-score',
                    condition: {
                      id: 'cond-1',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
                      value: 7,
                    },
                    minCount: 1,
                    maxCount: 5,
                  }),
                ],
              }),
            ],
          }),
        });
        await createTestTransferStage(experimentId, transferStage);

        // Create participant with low score (doesn't match)
        const p1 = await createTestParticipant(experimentId, 'p1', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p1',
          connected: true,
        });
        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {q1: {kind: SurveyQuestionKind.SCALE, value: 3}}, // Low score
        });

        const result = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p1,
          );
        });

        // Should not transfer
        expect(result.response).toBeNull();
        expect(result.directTransferInstructions).toBeNull();
      });
    });

    describe('Multiple choice conditions', () => {
      it('should work with multiple choice survey answers', async () => {
        const experimentId = generateId();
        const cohortId = generateId(true);
        const surveyStageId = 'survey-stage';
        const transferStageId = 'transfer-stage';

        await createTestExperiment(experimentId, {
          stageIds: [surveyStageId, transferStageId],
        });
        await createTestCohort(experimentId, cohortId, 'Source Cohort');

        // Require participants who answered "yes"
        const transferStage = createTransferStage({
          id: transferStageId,
          autoTransferConfig: createConditionAutoTransferConfig({
            autoCohortParticipantConfig: createCohortParticipantConfig(),
            transferGroups: [
              createTransferGroup({
                name: 'Yes Responders',
                composition: [
                  createGroupComposition({
                    id: 'yes-answer',
                    condition: {
                      id: 'cond-1',
                      type: 'comparison',
                      target: {stageId: surveyStageId, questionId: 'q1'},
                      operator: ComparisonOperator.EQUALS,
                      value: 'yes',
                    },
                    minCount: 2,
                    maxCount: 3,
                  }),
                ],
              }),
            ],
          }),
        });
        await createTestTransferStage(experimentId, transferStage);

        // Create 2 participants who answered "yes"
        const p1 = await createTestParticipant(experimentId, 'p1', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p1',
          connected: true,
        });
        await createTestParticipant(experimentId, 'p2', cohortId, {
          stageId: transferStageId,
          publicId: 'pub-p2',
          connected: true,
        });

        await createTestSurveyData(experimentId, cohortId, surveyStageId, {
          'pub-p1': {
            q1: {kind: SurveyQuestionKind.MULTIPLE_CHOICE, choiceId: 'yes'},
          },
          'pub-p2': {
            q1: {kind: SurveyQuestionKind.MULTIPLE_CHOICE, choiceId: 'yes'},
          },
        });

        const result = await firestore.runTransaction(async (transaction) => {
          return handleAutomaticTransfer(
            transaction,
            experimentId,
            transferStage,
            p1,
          );
        });

        expect(result.response).not.toBeNull();
      });
    });
  });
});
