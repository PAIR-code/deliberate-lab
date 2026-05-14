import {
  BaseStageConfig,
  ModelResponseStatus,
  StageKind,
  UserType,
} from '@deliberation-lab/utils';

// ---- Mocks ----

jest.mock('../app', () => {
  const setMock = jest.fn().mockResolvedValue(undefined);
  const getMock = jest.fn().mockResolvedValue({exists: false});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    get: getMock,
    set: setMock,
    collection: jest.fn(),
    doc: jest.fn(),
  };
  chain.collection.mockReturnValue(chain);
  chain.doc.mockReturnValue(chain);
  return {
    __esModule: true,
    app: {firestore: jest.fn().mockReturnValue(chain)},
    __mocks__: {setMock, getMock},
  };
});

jest.mock('../agent.utils', () => {
  const processModelResponseMock = jest.fn();
  return {
    __esModule: true,
    processModelResponse: (...args: unknown[]) =>
      processModelResponseMock(...args),
    __mocks__: {processModelResponseMock},
  };
});

jest.mock('../structured_prompt.utils', () => {
  const getPromptFromConfigMock = jest.fn().mockResolvedValue('test prompt');
  const getStructuredPromptConfigMock = jest.fn();
  return {
    __esModule: true,
    getPromptFromConfig: (...args: unknown[]) =>
      getPromptFromConfigMock(...args),
    getStructuredPromptConfig: (...args: unknown[]) =>
      getStructuredPromptConfigMock(...args),
    __mocks__: {getPromptFromConfigMock, getStructuredPromptConfigMock},
  };
});

jest.mock('../variables.utils', () => ({
  __esModule: true,
  resolveStringWithVariables: jest.fn(async (s: string) => s),
}));

jest.mock('./message_converter.utils', () => ({
  __esModule: true,
  convertChatToMessages: jest.fn().mockReturnValue([]),
  shouldUseMessageFormat: jest.fn().mockReturnValue(false),
  MessageRole: {SYSTEM: 'system', USER: 'user', ASSISTANT: 'assistant'},
}));

jest.mock('../chat/chat.utils', () => ({
  __esModule: true,
  updateParticipantReadyToEndChat: jest.fn(),
}));

jest.mock('../utils/firestore', () => {
  const getFirestoreStageMock = jest.fn();
  const getFirestorePrivateChatMessagesMock = jest.fn().mockResolvedValue([]);
  const getFirestorePublicStageChatMessagesMock = jest
    .fn()
    .mockResolvedValue([]);
  const getExperimenterDataFromExperimentMock = jest.fn().mockResolvedValue({
    apiKeys: {geminiKey: 'test-key'},
  });
  const getFirestoreActiveMediatorsMock = jest.fn().mockResolvedValue([]);
  const getFirestoreActiveParticipantsMock = jest.fn().mockResolvedValue([]);
  const getGroupChatTriggerLogRefMock = jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({exists: false}),
    set: jest.fn().mockResolvedValue(undefined),
  });
  const getPrivateChatTriggerLogRefMock = jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({exists: false}),
    set: jest.fn().mockResolvedValue(undefined),
  });
  const participantAnswerDocSetMock = jest.fn().mockResolvedValue(undefined);
  const getFirestoreParticipantAnswerRefMock = jest.fn().mockReturnValue({
    set: participantAnswerDocSetMock,
  });
  const getFirestoreStagePublicDataMock = jest.fn().mockResolvedValue(null);
  return {
    __esModule: true,
    getFirestoreStage: (...args: unknown[]) => getFirestoreStageMock(...args),
    getFirestorePrivateChatMessages: (...args: unknown[]) =>
      getFirestorePrivateChatMessagesMock(...args),
    getFirestorePublicStageChatMessages: (...args: unknown[]) =>
      getFirestorePublicStageChatMessagesMock(...args),
    getExperimenterDataFromExperiment: (...args: unknown[]) =>
      getExperimenterDataFromExperimentMock(...args),
    getFirestoreActiveMediators: (...args: unknown[]) =>
      getFirestoreActiveMediatorsMock(...args),
    getFirestoreActiveParticipants: (...args: unknown[]) =>
      getFirestoreActiveParticipantsMock(...args),
    getGroupChatTriggerLogRef: (...args: unknown[]) =>
      getGroupChatTriggerLogRefMock(...args),
    getPrivateChatTriggerLogRef: (...args: unknown[]) =>
      getPrivateChatTriggerLogRefMock(...args),
    getFirestoreParticipantAnswerRef: (...args: unknown[]) =>
      getFirestoreParticipantAnswerRefMock(...args),
    getFirestoreStagePublicData: (...args: unknown[]) =>
      getFirestoreStagePublicDataMock(...args),
    __mocks__: {
      getFirestoreStageMock,
      getFirestorePrivateChatMessagesMock,
      getFirestorePublicStageChatMessagesMock,
      getExperimenterDataFromExperimentMock,
      getFirestoreActiveMediatorsMock,
      participantAnswerDocSetMock,
      getFirestoreParticipantAnswerRefMock,
    },
  };
});

jest.mock('../utils/storage', () => ({
  __esModule: true,
  getChatMessageStoragePath: jest.fn(),
  uploadModelResponseFiles: jest.fn().mockResolvedValue([]),
}));

jest.mock('../log.utils', () => ({
  __esModule: true,
  updateModelLogFiles: jest.fn(),
}));

import {
  AgentMessageResult,
  createAgentChatMessageFromPrompt,
  getAgentChatMessage,
} from './chat.agent';
import {__mocks__ as agentUtilsMocks} from '../agent.utils';
import {__mocks__ as promptMocks} from '../structured_prompt.utils';
import {__mocks__ as firestoreMocks} from '../utils/firestore';

// ---- Shared helpers ----

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    type: UserType.MEDIATOR,
    publicId: 'mediator-1',
    privateId: 'priv-mediator-1',
    agentConfig: {
      agentId: 'agent-1',
      modelSettings: {model: 'gemini-pro'},
    },
    ...overrides,
  };
}

function createMockStage(overrides: Partial<BaseStageConfig> = {}) {
  return {
    id: 'stage-1',
    kind: StageKind.PRIVATE_CHAT,
    ...overrides,
  };
}

/** Set up mocks so createAgentChatMessageFromPrompt reaches getAgentChatMessage. */
function setupBasicMocks(stageOverrides: Partial<BaseStageConfig> = {}) {
  const stage = createMockStage(stageOverrides);
  firestoreMocks.getFirestoreStageMock.mockResolvedValue(stage);
  promptMocks.getStructuredPromptConfigMock.mockResolvedValue({
    chatSettings: {
      maxResponses: null,
      minMessagesBeforeResponding: 0,
      canSelfTriggerCalls: true,
      wordsPerMinute: 0,
    },
    generationConfig: {},
    structuredOutputConfig: undefined,
  });
  return stage;
}

/** Build a successful model response with optional structured output. */
function makeModelResponse(
  overrides: Partial<{
    status: ModelResponseStatus;
    text: string | null;
    reasoning: string | null;
    rawResponse: string | null;
    files: unknown[] | null;
  }> = {},
) {
  return {
    response: {
      status: ModelResponseStatus.OK,
      text: 'Hello!',
      reasoning: null,
      rawResponse: null,
      files: null,
      ...overrides,
    },
    logId: 'log-1',
  };
}

// ---- Tests ----

describe('createAgentChatMessageFromPrompt return type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 'error' when user has no agentConfig", async () => {
    const user = createMockUser({agentConfig: null});

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      user,
    );

    expect(result).toBe(AgentMessageResult.ERROR);
  });

  it("returns 'error' when stage is not found", async () => {
    firestoreMocks.getFirestoreStageMock.mockResolvedValue(null);

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      createMockUser(),
    );

    expect(result).toBe(AgentMessageResult.ERROR);
  });

  it("returns 'declined' when canSendAgentChatMessage returns false (maxResponses hit)", async () => {
    setupBasicMocks();
    // Make chat history show the agent already sent a message, with maxResponses: 1
    promptMocks.getStructuredPromptConfigMock.mockResolvedValue({
      chatSettings: {
        maxResponses: 1,
        minMessagesBeforeResponding: 0,
        canSelfTriggerCalls: true,
        wordsPerMinute: 0,
      },
      generationConfig: {},
      structuredOutputConfig: undefined,
    });
    firestoreMocks.getFirestorePrivateChatMessagesMock.mockResolvedValue([
      {senderId: 'mediator-1', message: 'hi'},
    ]);

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      createMockUser(),
    );

    expect(result).toBe(AgentMessageResult.DECLINED);
  });

  it("returns 'declined' when structured output shouldRespond is false", async () => {
    setupBasicMocks();
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeModelResponse({
        text: JSON.stringify({
          shouldRespond: false,
          response: '',
          explanation: '',
          readyToEndChat: false,
        }),
      }),
    );

    // Enable structured output so shouldRespond is extracted
    promptMocks.getStructuredPromptConfigMock.mockResolvedValue({
      chatSettings: {
        maxResponses: null,
        minMessagesBeforeResponding: 0,
        canSelfTriggerCalls: true,
        wordsPerMinute: 0,
      },
      generationConfig: {},
      structuredOutputConfig: {
        enabled: true,
        type: 'JSON_SCHEMA',
        appendToPrompt: true,
        shouldRespondField: 'shouldRespond',
        messageField: 'response',
        explanationField: 'explanation',
        readyToEndField: 'readyToEndChat',
        schema: {type: 'OBJECT', properties: []},
      },
    });

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      createMockUser(),
    );

    expect(result).toBe(AgentMessageResult.DECLINED);
  });

  it("returns 'sent' when message is written to Firestore", async () => {
    setupBasicMocks();
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeModelResponse(),
    );

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      createMockUser(),
    );

    expect(result).toBe(AgentMessageResult.SENT);
  });

  it("returns 'error' when model response fails", async () => {
    setupBasicMocks();
    agentUtilsMocks.processModelResponseMock.mockResolvedValue({
      response: {
        status: ModelResponseStatus.UNKNOWN_ERROR,
        text: null,
        reasoning: null,
        rawResponse: null,
        files: null,
      },
      logId: 'log-1',
    });

    const result = await createAgentChatMessageFromPrompt(
      'exp-1',
      'cohort-1',
      ['p-1'],
      'stage-1',
      'chat-1',
      createMockUser(),
    );

    expect(result).toBe(AgentMessageResult.ERROR);
  });
});

describe('getAgentChatMessage shouldRespond/readyToEndChat decoupling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreMocks.getExperimenterDataFromExperimentMock.mockResolvedValue({
      apiKeys: {geminiKey: 'test-key'},
    });
    firestoreMocks.getFirestorePrivateChatMessagesMock.mockResolvedValue([
      {senderId: 'human-1', message: 'hello'}, // Need at least one message for readyToEndChat
    ]);
  });

  function makeStructuredResponse(
    shouldRespond: boolean,
    readyToEndChat: boolean,
  ) {
    return makeModelResponse({
      text: JSON.stringify({
        shouldRespond,
        response: 'test msg',
        explanation: 'reason',
        readyToEndChat,
      }),
    });
  }

  const stage = createMockStage();

  const promptConfig = {
    chatSettings: {
      maxResponses: null,
      minMessagesBeforeResponding: 0,
      canSelfTriggerCalls: true,
      wordsPerMinute: 0,
    },
    generationConfig: {},
    structuredOutputConfig: {
      enabled: true,
      type: 'JSON_SCHEMA',
      appendToPrompt: true,
      shouldRespondField: 'shouldRespond',
      messageField: 'response',
      explanationField: 'explanation',
      readyToEndField: 'readyToEndChat',
      schema: {type: 'OBJECT', properties: []},
    },
  };

  it('shouldRespond: false + readyToEndChat: false → does NOT set readyToEndChat on answer doc', async () => {
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeStructuredResponse(false, false),
    );

    const user = createMockUser({type: UserType.PARTICIPANT});
    const result = await getAgentChatMessage(
      'exp-1',
      'cohort-1',
      ['p-1'],
      stage,
      user,
      promptConfig,
    );

    expect(result.message).toBeNull();
    expect(result.success).toBe(true);
    expect(firestoreMocks.participantAnswerDocSetMock).not.toHaveBeenCalled();
  });

  it('shouldRespond: false + readyToEndChat: true → sets readyToEndChat on answer doc', async () => {
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeStructuredResponse(false, true),
    );

    const user = createMockUser({type: UserType.PARTICIPANT});
    const result = await getAgentChatMessage(
      'exp-1',
      'cohort-1',
      ['p-1'],
      stage,
      user,
      promptConfig,
    );

    expect(result.message).toBeNull();
    expect(result.success).toBe(true);
    expect(firestoreMocks.participantAnswerDocSetMock).toHaveBeenCalledWith(
      {readyToEndChat: true},
      {merge: true},
    );
  });

  it('shouldRespond: true + readyToEndChat: false → returns message, does NOT set readyToEndChat', async () => {
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeStructuredResponse(true, false),
    );

    const user = createMockUser({type: UserType.PARTICIPANT});
    const result = await getAgentChatMessage(
      'exp-1',
      'cohort-1',
      ['p-1'],
      stage,
      user,
      promptConfig,
    );

    expect(result.message).not.toBeNull();
    expect(result.success).toBe(true);
    expect(firestoreMocks.participantAnswerDocSetMock).not.toHaveBeenCalled();
  });

  it('shouldRespond: true + readyToEndChat: true → sets readyToEndChat and returns message', async () => {
    agentUtilsMocks.processModelResponseMock.mockResolvedValue(
      makeStructuredResponse(true, true),
    );

    const user = createMockUser({type: UserType.PARTICIPANT});
    const result = await getAgentChatMessage(
      'exp-1',
      'cohort-1',
      ['p-1'],
      stage,
      user,
      promptConfig,
    );

    expect(result.message).not.toBeNull();
    expect(result.success).toBe(true);
    expect(firestoreMocks.participantAnswerDocSetMock).toHaveBeenCalledWith(
      {readyToEndChat: true},
      {merge: true},
    );
  });
});
