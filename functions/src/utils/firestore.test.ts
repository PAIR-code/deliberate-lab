jest.mock('../app', () => ({
  app: {
    firestore: jest.fn(),
  },
}));

import {
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  ChatMessage,
  CohortConfig,
  Experiment,
  ExperimenterData,
  MediatorProfileExtended,
  MediatorStatus,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageParticipantAnswer,
  StagePublicData,
} from '@deliberation-lab/utils';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import type {Firestore} from 'firebase-admin/firestore';

import {app} from '../app';
import {
  getAgentMediatorPersonas,
  getAgentParticipantPrompt,
  getExperimenterData,
  getExperimenterDataFromExperiment,
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreAnswersForStage,
  getFirestoreCohort,
  getFirestoreCohortParticipants,
  getFirestoreCohortRef,
  getFirestoreExperiment,
  getFirestoreExperimentRef,
  getFirestoreParticipant,
  getFirestoreParticipantAnswer,
  getFirestoreParticipantAnswerRef,
  getFirestoreParticipantRef,
  getFirestorePrivateChatMessages,
  getFirestorePublicStageChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreStagePublicDataRef,
  getFirestoreStageRef,
  getGroupChatTriggerLogRef,
  getPrivateChatTriggerLogRef,
} from './firestore';

const firestoreMock = app.firestore as jest.Mock;

const RULES = [
  "rules_version = '2';",
  'service cloud.firestore {',
  '  match /databases/{database}/documents {',
  '    match /{document=**} {',
  '      allow read, write: if true;',
  '    }',
  '  }',
  '}',
].join('\n');

const experimenterId = 'creator-1';
const experimentId = 'experiment-1';
const cohortId = 'cohort-1';
const stageId = 'stage-1';
const participantPrivateId = 'participant-private-1';
const participantPrivateId2 = 'participant-private-2';
const triggerLogId = 'trigger-log-1';
const agentId = 'agent-1';

const experimenterRecord = {
  id: experimenterId,
} as unknown as ExperimenterData;

const experimentRecord = {
  metadata: {
    creator: experimenterId,
  },
} as unknown as Experiment;

const cohortRecord = {
  id: cohortId,
} as unknown as CohortConfig;

const stageRecord = {
  id: stageId,
} as unknown as StageConfig;

const stagePublicRecord = {
  stageId,
} as unknown as StagePublicData;

const stageAnswer1 = {
  answer: 'value-1',
} as unknown as StageParticipantAnswer;

const stageAnswer2 = {
  answer: 'value-2',
} as unknown as StageParticipantAnswer;

const participantAgent = {
  privateId: participantPrivateId,
  currentCohortId: cohortId,
  currentStageId: stageId,
  currentStatus: ParticipantStatus.IN_PROGRESS,
  agentConfig: {personaId: 'agent-persona-1'},
} as unknown as ParticipantProfileExtended;

const participantHuman = {
  privateId: participantPrivateId2,
  currentCohortId: cohortId,
  currentStageId: 'stage-2',
  currentStatus: ParticipantStatus.SUCCESS,
  agentConfig: null,
} as unknown as ParticipantProfileExtended;

const participantInactive = {
  privateId: 'participant-inactive',
  currentCohortId: 'cohort-2',
  currentStageId: stageId,
  currentStatus: ParticipantStatus.PAUSED,
  agentConfig: null,
} as unknown as ParticipantProfileExtended;

const mediatorAgent = {
  currentCohortId: cohortId,
  currentStatus: MediatorStatus.ACTIVE,
  agentConfig: {personaId: 'mediator-agent'},
} as unknown as MediatorProfileExtended;

const mediatorHuman = {
  currentCohortId: cohortId,
  currentStatus: MediatorStatus.ACTIVE,
  agentConfig: null,
} as unknown as MediatorProfileExtended;

const mediatorPaused = {
  currentCohortId: cohortId,
  currentStatus: MediatorStatus.PAUSED,
  agentConfig: null,
} as unknown as MediatorProfileExtended;

const agentPersonaRecord = {
  personaId: 'mediator-agent',
} as unknown as AgentPersonaConfig;

const agentPromptRecord = {
  prompt: 'call to action',
} as unknown as AgentParticipantPromptConfig;

const publicChatEarly = {
  id: 'chat-early',
  timestamp: 1,
} as unknown as ChatMessage;

const publicChatLate = {
  id: 'chat-late',
  timestamp: 3,
} as unknown as ChatMessage;

const privateChatEarly = {
  id: 'private-early',
  timestamp: 2,
} as unknown as ChatMessage;

const privateChatLate = {
  id: 'private-late',
  timestamp: 4,
} as unknown as ChatMessage;

const publicTriggerLogRecord = {message: 'public trigger'};
const privateTriggerLogRecord = {message: 'private trigger'};

let testEnv: RulesTestEnvironment;
let mockFirestore: Firestore;

async function seedBaseData(firestore: Firestore) {
  const experimentRef = firestore.collection('experiments').doc(experimentId);

  await firestore.collection('experimenterData').doc(experimenterId).set(experimenterRecord);
  await experimentRef.set(experimentRecord);

  const participantsRef = experimentRef.collection('participants');
  await participantsRef.doc(participantPrivateId).set(participantAgent);
  await participantsRef
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId)
    .set(stageAnswer1);
  await participantsRef
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(triggerLogId)
    .set(privateTriggerLogRecord);
  await participantsRef
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId)
    .collection('privateChats')
    .doc('privateEarly')
    .set(privateChatEarly);
  await participantsRef
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId)
    .collection('privateChats')
    .doc('privateLate')
    .set(privateChatLate);

  await participantsRef.doc(participantPrivateId2).set(participantHuman);
  await participantsRef
    .doc(participantPrivateId2)
    .collection('stageData')
    .doc(stageId)
    .set(stageAnswer2);

  await participantsRef.doc('participant-inactive').set(participantInactive);

  const mediatorsRef = experimentRef.collection('mediators');
  await mediatorsRef.doc('mediatorAgent').set(mediatorAgent);
  await mediatorsRef.doc('mediatorHuman').set(mediatorHuman);
  await mediatorsRef.doc('mediatorPaused').set(mediatorPaused);

  const cohortRef = experimentRef.collection('cohorts').doc(cohortId);
  await cohortRef.set(cohortRecord);
  await cohortRef.collection('publicStageData').doc(stageId).set(stagePublicRecord);
  await cohortRef
    .collection('publicStageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(triggerLogId)
    .set(publicTriggerLogRecord);
  await cohortRef
    .collection('publicStageData')
    .doc(stageId)
    .collection('chats')
    .doc('publicEarly')
    .set(publicChatEarly);
  await cohortRef
    .collection('publicStageData')
    .doc(stageId)
    .collection('chats')
    .doc('publicLate')
    .set(publicChatLate);

  await experimentRef.collection('stages').doc(stageId).set(stageRecord);
  await experimentRef.collection('agentMediators').doc('personaAgent').set(agentPersonaRecord);
  await experimentRef.collection('agents').doc(agentId).set({});
  await experimentRef
    .collection('agents')
    .doc(agentId)
    .collection('participantPrompts')
    .doc(stageId)
    .set(agentPromptRecord);
}

describe('firestore utils', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'deliberate-lab-test',
      firestore: {
        rules: RULES,
        ...(!process.env.FIRESTORE_EMULATOR_HOST && {
          host: 'localhost',
          port: 8080,
        }),
      },
    });
    mockFirestore = testEnv.unauthenticatedContext().firestore();
    mockFirestore.settings({ignoreUndefinedProperties: true, merge: true});
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    firestoreMock.mockReturnValue(mockFirestore);
    await testEnv.clearFirestore();
    await seedBaseData(mockFirestore);
  });

  it('gets experimenter data by id', async () => {
    const result = await getExperimenterData(experimenterId);
    expect(result).toEqual(experimenterRecord);
  });

  it('returns undefined when experimenter data is missing', async () => {
    await mockFirestore.collection('experimenterData').doc(experimenterId).delete();
    const result = await getExperimenterData(experimenterId);
    expect(result).toBeUndefined();
  });

  it('gets experimenter data via experiment lookup', async () => {
    const result = await getExperimenterDataFromExperiment(experimentId);
    expect(result).toEqual(experimenterRecord);
  });

  it('returns experiment doc reference', async () => {
    const ref = getFirestoreExperimentRef(experimentId);
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(experimentRecord);
  });

  it('fetches experiment data', async () => {
    const result = await getFirestoreExperiment(experimentId);
    expect(result).toEqual(experimentRecord);
  });

  it('returns undefined when experiment doc missing', async () => {
    await mockFirestore.collection('experiments').doc(experimentId).delete();
    const result = await getFirestoreExperiment(experimentId);
    expect(result).toBeUndefined();
  });

  it('returns participant doc reference', async () => {
    const ref = getFirestoreParticipantRef(experimentId, participantPrivateId);
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(participantAgent);
  });

  it('fetches participant data', async () => {
    const result = await getFirestoreParticipant(
      experimentId,
      participantPrivateId,
    );
    expect(result).toEqual(participantAgent);
  });

  it('returns undefined when participant doc missing', async () => {
    await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantPrivateId)
      .delete();
    const result = await getFirestoreParticipant(
      experimentId,
      participantPrivateId,
    );
    expect(result).toBeUndefined();
  });

  it('fetches participants for cohort', async () => {
    const result = await getFirestoreCohortParticipants(experimentId, cohortId);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([participantAgent, participantHuman]),
    );
  });

  it('fetches active mediators regardless of agent config', async () => {
    const result = await getFirestoreActiveMediators(experimentId, cohortId);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([mediatorAgent, mediatorHuman]),
    );
  });

  it('filters active mediators by agent config when requested', async () => {
    const result = await getFirestoreActiveMediators(
      experimentId,
      cohortId,
      null,
      true,
    );
    expect(result).toEqual([mediatorAgent]);
  });

  it('fetches active participants in cohort', async () => {
    const result = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
    );
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([participantAgent, participantHuman]),
    );
  });

  it('filters active participants by stage when provided', async () => {
    const result = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
      stageId,
    );
    expect(result).toEqual([participantAgent]);
  });

  it('filters active participants by agent config when requested', async () => {
    const result = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
      null,
      true,
    );
    expect(result).toEqual([participantAgent]);
  });

  it('returns cohort doc reference', async () => {
    const ref = getFirestoreCohortRef(experimentId, cohortId);
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(cohortRecord);
  });

  it('fetches cohort config', async () => {
    const result = await getFirestoreCohort(experimentId, cohortId);
    expect(result).toEqual(cohortRecord);
  });

  it('returns stage doc reference', async () => {
    const ref = getFirestoreStageRef(experimentId, stageId);
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(stageRecord);
  });

  it('fetches stage config', async () => {
    const result = await getFirestoreStage(experimentId, stageId);
    expect(result).toEqual(stageRecord);
  });

  it('returns participant answer doc reference', async () => {
    const ref = getFirestoreParticipantAnswerRef(
      experimentId,
      participantPrivateId,
      stageId,
    );
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(stageAnswer1);
  });

  it('fetches participant answer', async () => {
    const result = await getFirestoreParticipantAnswer(
      experimentId,
      participantPrivateId,
      stageId,
    );
    expect(result).toEqual(stageAnswer1);
  });

  it('returns undefined when participant answer missing', async () => {
    await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantPrivateId)
      .collection('stageData')
      .doc(stageId)
      .delete();
    const result = await getFirestoreParticipantAnswer(
      experimentId,
      participantPrivateId,
      stageId,
    );
    expect(result).toBeUndefined();
  });

  it('fetches answers for stage using active participants', async () => {
    const result = await getFirestoreAnswersForStage(
      experimentId,
      cohortId,
      stageId,
    );
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        {participantId: participantPrivateId, answer: stageAnswer1},
        {participantId: participantPrivateId2, answer: stageAnswer2},
      ]),
    );
  });

  it('fetches answers for specific participant ids', async () => {
    const result = await getFirestoreAnswersForStage(
      experimentId,
      cohortId,
      stageId,
      [participantPrivateId2],
    );
    expect(result).toEqual([
      {participantId: participantPrivateId2, answer: stageAnswer2},
    ]);
  });

  it('returns stage public data doc reference', async () => {
    const ref = getFirestoreStagePublicDataRef(
      experimentId,
      cohortId,
      stageId,
    );
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(stagePublicRecord);
  });

  it('fetches stage public data', async () => {
    const result = await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    expect(result).toEqual(stagePublicRecord);
  });

  it('returns group chat trigger log ref', async () => {
    const ref = getGroupChatTriggerLogRef(
      experimentId,
      cohortId,
      stageId,
      triggerLogId,
    );
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(publicTriggerLogRecord);
  });

  it('returns private chat trigger log ref', async () => {
    const ref = getPrivateChatTriggerLogRef(
      experimentId,
      participantPrivateId,
      stageId,
      triggerLogId,
    );
    const doc = await ref.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(privateTriggerLogRecord);
  });

  it('fetches agent mediator personas', async () => {
    const result = await getAgentMediatorPersonas(experimentId);
    expect(result).toEqual([agentPersonaRecord]);
  });

  it('fetches agent participant prompt when present', async () => {
    const result = await getAgentParticipantPrompt(
      experimentId,
      stageId,
      agentId,
    );
    expect(result).toEqual(agentPromptRecord);
  });

  it('returns null for missing agent participant prompt', async () => {
    await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('agents')
      .doc(agentId)
      .collection('participantPrompts')
      .doc(stageId)
      .delete();
    const result = await getAgentParticipantPrompt(
      experimentId,
      stageId,
      agentId,
    );
    expect(result).toBeNull();
  });

  it('fetches public chat messages in ascending order', async () => {
    const result = await getFirestorePublicStageChatMessages(
      experimentId,
      cohortId,
      stageId,
    );
    expect(result).toEqual([publicChatEarly, publicChatLate]);
  });

  it('fetches private chat messages in ascending order', async () => {
    const result = await getFirestorePrivateChatMessages(
      experimentId,
      participantPrivateId,
      stageId,
    );
    expect(result).toEqual([privateChatEarly, privateChatLate]);
  });

  it('returns empty list when public chat retrieval fails', async () => {
    firestoreMock.mockReturnValueOnce({
      collection: () => ({
        orderBy: () => {
          throw new Error('query failure');
        },
      }),
    });
    const result = await getFirestorePublicStageChatMessages(
      experimentId,
      cohortId,
      stageId,
    );
    expect(result).toEqual([]);
  });

  it('returns empty list when private chat retrieval fails', async () => {
    firestoreMock.mockReturnValueOnce({
      collection: () => ({
        orderBy: () => ({
          get: () => {
            throw new Error('query failure');
          },
        }),
      }),
    });
    const result = await getFirestorePrivateChatMessages(
      experimentId,
      participantPrivateId,
      stageId,
    );
    expect(result).toEqual([]);
  });
});
