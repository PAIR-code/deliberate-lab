jest.mock('../app', () => ({
  app: {
    firestore: jest.fn(),
  },
}));

import {
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  ChatMessage,
  ChatStagePublicData,
  ExperimenterData,
  MediatorProfileExtended,
  MediatorStatus,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
  UserType,
  createCohortConfig,
  createAgentMediatorPersonaConfig,
  createAgentModelSettings,
  createAgentPromptSettings,
  createChatStage,
  createChatStageParticipantAnswer,
  createChatStagePublicData,
  createDefaultChatDiscussion,
  createMediatorChatMessage,
  createModelGenerationConfig,
  createParticipantChatMessage,
  createParticipantProfileBase,
  createParticipantProfileExtended,
  createProgressTimestamps,
  createStructuredOutputConfig,
  createExperimentConfig,
  createExperimenterData,
  createMetadataConfig,
} from '@deliberation-lab/utils';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

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
import {Timestamp as ClientTimestamp} from 'firebase-admin/firestore';

type TestFirestore = ReturnType<
  ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']
>;

const firestoreMock = app.firestore as jest.Mock;

// Rules are ignored in the admin SDK, but required to initialize the test environment.
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

const experimenterId = 'julia-researcher';
const experimentId = 'civic-forum-2025';
const cohortId = 'berlin-cohort';
const stageId = 'brainstorm-session';
const discussionId = 'discussion-night-transit';
const participantPrivateId = 'participant-alex-private';
const participantPrivateId2 = 'participant-taylor-private';
const triggerLogId = 'trigger-001';
const agentId = 'companion-agent-1';

const experimenterRecord: ExperimenterData = {
  ...createExperimenterData(experimenterId, 'julia.researcher@example.com'),
  viewedExperiments: [experimentId],
};

const stageRecord: StageConfig = createChatStage({
  id: stageId,
  name: 'Brainstorm shared transit ideas',
  descriptions: {
    primaryText: 'Propose ways Berlin could make nighttime travel safer.',
    infoText:
      'Share concrete pilots the city could launch within three months.',
    helpText: 'Offer one idea at a time so other participants can iterate.',
  },
  discussions: [
    createDefaultChatDiscussion({
      id: discussionId,
      description:
        'Collect actionable experiments to improve late-night transit.',
    }),
  ],
  timeLimitInMinutes: 20,
  requireFullTime: true,
});

const stagePublicRecord: ChatStagePublicData = {
  ...createChatStagePublicData(stageRecord),
  discussionTimestampMap: {[discussionId]: {}},
};

const experimentRecord = createExperimentConfig([stageRecord], {
  id: experimentId,
  metadata: createMetadataConfig({
    name: 'Berlin Civic Transit Forum',
    publicName: 'Berlin Civic Transit Forum',
    description:
      'Community forum exploring how Berlin might improve nighttime transit access.',
    creator: experimenterId,
    dateCreated: ClientTimestamp.fromMillis(0),
    dateModified: ClientTimestamp.fromMillis(0),
  }),
});

const cohortRecord = createCohortConfig({
  id: cohortId,
  metadata: createMetadataConfig({
    name: 'Berlin Pilot Cohort',
    description: 'First cohort piloting the civic transit forum.',
    creator: experimenterId,
    dateCreated: ClientTimestamp.fromMillis(0),
    dateModified: ClientTimestamp.fromMillis(0),
  }),
  stageUnlockMap: {[stageId]: true},
});

const stageAnswer1: StageParticipantAnswer = createChatStageParticipantAnswer({
  id: stageId,
  discussionTimestampMap: {[discussionId]: null},
});

const stageAnswer2: StageParticipantAnswer = createChatStageParticipantAnswer({
  id: stageId,
  discussionTimestampMap: {
    [discussionId]: ClientTimestamp.fromMillis(1),
  },
});

const participantAgent: ParticipantProfileExtended =
  createParticipantProfileExtended({
    privateId: participantPrivateId,
    publicId: 'alex-companion',
    name: 'Alex (AI Companion)',
    avatar: '🤖',
    pronouns: 'they/them',
    currentCohortId: cohortId,
    currentStageId: stageId,
    currentStatus: ParticipantStatus.IN_PROGRESS,
    timestamps: createProgressTimestamps({
      readyStages: {[stageId]: ClientTimestamp.fromMillis(0)},
    }),
    agentConfig: {
      agentId: 'mediator-aurora',
      promptContext: '',
      modelSettings: createAgentModelSettings({modelName: 'gemini-2.5-flash'}),
    },
  });

const participantHuman: ParticipantProfileExtended =
  createParticipantProfileExtended({
    privateId: participantPrivateId2,
    publicId: 'taylor-johnson',
    name: 'Taylor Johnson',
    avatar: '🚲',
    pronouns: 'she/her',
    currentCohortId: cohortId,
    currentStageId: 'reflection-session',
    currentStatus: ParticipantStatus.SUCCESS,
    agentConfig: null,
  });

const participantInactive: ParticipantProfileExtended =
  createParticipantProfileExtended({
    privateId: 'participant-zoe-private',
    publicId: 'zoe-schmidt',
    name: 'Zoe Schmidt',
    avatar: '🛹',
    pronouns: 'she/her',
    currentCohortId: 'munich-cohort',
    currentStageId: stageId,
    currentStatus: ParticipantStatus.PAUSED,
    agentConfig: null,
  });

const mediatorAgent: MediatorProfileExtended = {
  type: UserType.MEDIATOR,
  publicId: 'aurora-mediator',
  privateId: 'mediator-aurora-private',
  name: 'Aurora (AI Mediator)',
  avatar: '🤖',
  pronouns: 'she/her',
  currentStatus: MediatorStatus.ACTIVE,
  currentCohortId: cohortId,
  activeStageMap: {[stageId]: true},
  agentConfig: {
    agentId: 'mediator-aurora',
    promptContext: '',
    modelSettings: createAgentModelSettings({modelName: 'gemini-2.5-flash'}),
  },
};

const mediatorHuman: MediatorProfileExtended = {
  type: UserType.MEDIATOR,
  publicId: 'samira-lee',
  privateId: 'mediator-samira-private',
  name: 'Samira Lee',
  avatar: '🧭',
  pronouns: 'she/her',
  currentStatus: MediatorStatus.ACTIVE,
  currentCohortId: cohortId,
  activeStageMap: {[stageId]: true},
  agentConfig: null,
};

const mediatorPaused: MediatorProfileExtended = {
  type: UserType.MEDIATOR,
  publicId: 'miguel-arroyo',
  privateId: 'mediator-miguel-private',
  name: 'Miguel Arroyo',
  avatar: '🎧',
  pronouns: 'he/him',
  currentStatus: MediatorStatus.PAUSED,
  currentCohortId: cohortId,
  activeStageMap: {[stageId]: true},
  agentConfig: null,
};

const agentPersonaRecord: AgentPersonaConfig = createAgentMediatorPersonaConfig(
  {
    id: 'mediator-aurora',
    name: 'Aurora (AI Mediator)',
    description: 'AI mediator trained to encourage inclusive brainstorming.',
    defaultProfile: createParticipantProfileBase({
      name: 'Aurora (AI Mediator)',
      avatar: '🤖',
      pronouns: 'she/her',
    }),
    defaultModelSettings: createAgentModelSettings({
      modelName: 'gemini-2.5-flash',
    }),
  },
);

const agentPromptRecord: AgentParticipantPromptConfig = {
  id: stageId,
  type: StageKind.CHAT,
  promptContext: 'Invite participants to build on the strongest transit ideas.',
  generationConfig: createModelGenerationConfig({
    maxTokens: 350,
    temperature: 0.7,
  }),
  promptSettings: createAgentPromptSettings({
    includeStageHistory: true,
    includeStageInfo: true,
  }),
  structuredOutputConfig: createStructuredOutputConfig(),
};

const publicChatEarly: ChatMessage = createParticipantChatMessage({
  id: 'chat-001',
  discussionId,
  message: 'Let’s list current pain points with the U-Bahn.',
  senderId: 'taylor-johnson',
  profile: createParticipantProfileBase({
    name: 'Taylor Johnson',
    avatar: '🚲',
    pronouns: 'she/her',
  }),
  timestamp: ClientTimestamp.fromMillis(1),
});

const publicChatLate: ChatMessage = createMediatorChatMessage({
  id: 'chat-002',
  discussionId,
  message: 'We could pilot night trams on weekends first.',
  senderId: 'aurora-mediator',
  agentId: 'mediator-aurora',
  profile: createParticipantProfileBase({
    name: 'Aurora (AI Mediator)',
    avatar: '🤖',
    pronouns: 'she/her',
  }),
  timestamp: ClientTimestamp.fromMillis(3),
});

const privateChatEarly: ChatMessage = createMediatorChatMessage({
  id: 'private-001',
  message: 'Remember to reference existing rider surveys.',
  senderId: 'companion-agent-1',
  agentId: 'mediator-aurora',
  profile: createParticipantProfileBase({
    name: 'Aurora (AI Mediator)',
    avatar: '🤖',
    pronouns: 'she/her',
  }),
  timestamp: ClientTimestamp.fromMillis(2),
});

const privateChatLate: ChatMessage = createMediatorChatMessage({
  id: 'private-002',
  message: 'Summarize consensus before the stage ends.',
  senderId: 'companion-agent-1',
  agentId: 'mediator-aurora',
  profile: createParticipantProfileBase({
    name: 'Aurora (AI Mediator)',
    avatar: '🤖',
    pronouns: 'she/her',
  }),
  timestamp: ClientTimestamp.fromMillis(4),
});

const publicTriggerLogRecord = {
  message: 'Posted recap to group channel',
  createdAt: ClientTimestamp.fromMillis(5),
};

const privateTriggerLogRecord = {
  message: 'Sent private reminder to Alex',
  createdAt: ClientTimestamp.fromMillis(5),
};

let testEnv: RulesTestEnvironment;
let mockFirestore: TestFirestore;

async function seedBaseData(firestore: TestFirestore) {
  const experimentRef = firestore.collection('experiments').doc(experimentId);

  await firestore
    .collection('experimenterData')
    .doc(experimenterId)
    .set(experimenterRecord);
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
  await cohortRef
    .collection('publicStageData')
    .doc(stageId)
    .set(stagePublicRecord);
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
  await experimentRef
    .collection('agentMediators')
    .doc('personaAgent')
    .set(agentPersonaRecord);
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
    await mockFirestore
      .collection('experimenterData')
      .doc(experimenterId)
      .delete();
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
    const result = await getFirestoreActiveParticipants(experimentId, cohortId);
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
    const ref = getFirestoreStagePublicDataRef(experimentId, cohortId, stageId);
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
