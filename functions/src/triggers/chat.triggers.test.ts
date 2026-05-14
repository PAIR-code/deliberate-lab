import firebaseFunctionsTest from 'firebase-functions-test';
import {StageKind, UserType} from '@deliberation-lab/utils';

// All mocks are built inside factories to avoid Jest hoisting issues.
// Access them via __mocks__ re-exports after importing.

jest.mock('../app', () => {
  const getMock = jest.fn();
  const setMock = jest.fn().mockResolvedValue(undefined);
  const transactionSetMock = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    get: getMock,
    set: setMock,
    collection: jest.fn(),
    doc: jest.fn(),
    runTransaction: jest.fn(async (fn: (tx: {set: jest.Mock}) => unknown) =>
      fn({set: transactionSetMock}),
    ),
  };
  chain.collection.mockReturnValue(chain);
  chain.doc.mockReturnValue(chain);
  return {
    __esModule: true,
    app: {
      firestore: jest.fn().mockReturnValue(chain),
    },
    __mocks__: {
      getMock,
      setMock,
      transactionSetMock,
    },
  };
});

jest.mock('../chat/chat.agent', () => {
  const createAgentChatMessageFromPromptMock = jest.fn();
  const actual = jest.requireActual('../chat/chat.agent');
  return {
    __esModule: true,
    AgentMessageResult: actual.AgentMessageResult,
    createAgentChatMessageFromPrompt: (...args: unknown[]) =>
      createAgentChatMessageFromPromptMock(...args),
    __mocks__: {createAgentChatMessageFromPromptMock},
  };
});

jest.mock('../chat/chat.utils', () => {
  const sendErrorPrivateChatMessageMock = jest
    .fn()
    .mockResolvedValue(undefined);
  return {
    __esModule: true,
    sendErrorPrivateChatMessage: (...args: unknown[]) =>
      sendErrorPrivateChatMessageMock(...args),
    __mocks__: {sendErrorPrivateChatMessageMock},
  };
});

jest.mock('../utils/firestore', () => {
  const getFirestoreStageMock = jest.fn();
  const getFirestoreParticipantMock = jest.fn();
  const getFirestoreActiveMediatorsMock = jest.fn();
  const getFirestoreExperimentMock = jest.fn();
  const participantAnswerDocSetMock = jest.fn().mockResolvedValue(undefined);
  const getFirestoreParticipantAnswerRefMock = jest.fn().mockReturnValue({
    set: participantAnswerDocSetMock,
  });
  const getFirestoreParticipantRefMock = jest.fn().mockReturnValue({});
  return {
    __esModule: true,
    getFirestoreStage: (...args: unknown[]) => getFirestoreStageMock(...args),
    getFirestoreParticipant: (...args: unknown[]) =>
      getFirestoreParticipantMock(...args),
    getFirestoreActiveMediators: (...args: unknown[]) =>
      getFirestoreActiveMediatorsMock(...args),
    getFirestoreActiveParticipants: jest.fn().mockResolvedValue([]),
    getFirestoreExperiment: (...args: unknown[]) =>
      getFirestoreExperimentMock(...args),
    getFirestoreParticipantAnswerRef: (...args: unknown[]) =>
      getFirestoreParticipantAnswerRefMock(...args),
    getFirestoreParticipantRef: (...args: unknown[]) =>
      getFirestoreParticipantRefMock(...args),
    getFirestoreStagePublicData: jest.fn().mockResolvedValue(null),
    __mocks__: {
      getFirestoreStageMock,
      getFirestoreParticipantMock,
      getFirestoreActiveMediatorsMock,
      getFirestoreExperimentMock,
      participantAnswerDocSetMock,
      getFirestoreParticipantAnswerRefMock,
      getFirestoreParticipantRefMock,
    },
  };
});

jest.mock('../participant.utils', () => {
  const updateParticipantNextStageMock = jest.fn().mockResolvedValue({
    currentStageId: 'stage-2',
    endExperiment: false,
  });
  return {
    __esModule: true,
    updateParticipantNextStage: (...args: unknown[]) =>
      updateParticipantNextStageMock(...args),
    __mocks__: {updateParticipantNextStageMock},
  };
});

jest.mock('../stages/chat.time', () => ({
  __esModule: true,
  startTimeElapsed: jest.fn(),
}));

import {onPrivateChatMessageCreated} from './chat.triggers';
import {AgentMessageResult} from '../chat/chat.agent';
import {__mocks__ as appMocks} from '../app';
import {__mocks__ as agentMocks} from '../chat/chat.agent';
import {__mocks__ as chatUtilsMocks} from '../chat/chat.utils';
import {__mocks__ as firestoreMocks} from '../utils/firestore';
import {__mocks__ as participantUtilsMocks} from '../participant.utils';

const testEnv = firebaseFunctionsTest({projectId: 'deliberate-lab-test'});

// Helper to set up the message that the trigger reads from Firestore
function setupMessage(overrides: Record<string, unknown> = {}) {
  const message = {
    type: UserType.PARTICIPANT,
    isError: false,
    discussionId: null,
    senderId: 'sender-1',
    ...overrides,
  };

  appMocks.getMock.mockResolvedValueOnce({
    data: () => message,
  });

  return message;
}

const EVENT_PARAMS = {
  experimentId: 'exp-1',
  participantId: 'participant-1',
  stageId: 'stage-1',
  chatId: 'chat-1',
};

function createMockParticipant(overrides: Record<string, unknown> = {}) {
  return {
    agentConfig: {agentId: 'agent-1'},
    currentStageId: 'stage-1',
    currentCohortId: 'cohort-1',
    privateId: 'participant-1',
    publicId: 'pub-1',
    ...overrides,
  };
}

function createMockMediator(id: string) {
  return {
    type: UserType.MEDIATOR,
    publicId: `mediator-${id}`,
    agentConfig: {agentId: `agent-mediator-${id}`},
  };
}

describe('onPrivateChatMessageCreated', () => {
  let wrapped: ReturnType<typeof testEnv.wrap>;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapped = testEnv.wrap(onPrivateChatMessageCreated);

    // Default stage
    firestoreMocks.getFirestoreStageMock.mockResolvedValue({
      id: 'stage-1',
      kind: StageKind.PRIVATE_CHAT,
    });
  });

  it('skips error messages', async () => {
    setupMessage({isError: true});

    await wrapped({params: EVENT_PARAMS});

    expect(firestoreMocks.getFirestoreStageMock).not.toHaveBeenCalled();
    expect(
      agentMocks.createAgentChatMessageFromPromptMock,
    ).not.toHaveBeenCalled();
  });

  describe('mediator error handling', () => {
    it('sends error message when mediator returns error', async () => {
      setupMessage();
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.ERROR,
      );

      await wrapped({params: EVENT_PARAMS});

      expect(
        chatUtilsMocks.sendErrorPrivateChatMessageMock,
      ).toHaveBeenCalledWith(
        'exp-1',
        'participant-1',
        'stage-1',
        expect.objectContaining({message: 'Error fetching response'}),
      );
    });

    it('does not send error message when mediator returns declined', async () => {
      setupMessage();
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );

      await wrapped({params: EVENT_PARAMS});

      expect(
        chatUtilsMocks.sendErrorPrivateChatMessageMock,
      ).not.toHaveBeenCalled();
    });
  });

  describe('no mediators configured', () => {
    it('sends error for human participants', async () => {
      setupMessage();
      const participant = createMockParticipant({agentConfig: null});

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([]);

      await wrapped({params: EVENT_PARAMS});

      expect(
        chatUtilsMocks.sendErrorPrivateChatMessageMock,
      ).toHaveBeenCalledWith(
        'exp-1',
        'participant-1',
        'stage-1',
        expect.objectContaining({message: 'No mediators found'}),
      );
    });

    it('skips error and advances agent participants', async () => {
      setupMessage();
      const participant = createMockParticipant();
      const experiment = {stageIds: ['stage-1', 'stage-2']};

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([]);
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(experiment);

      await wrapped({params: EVENT_PARAMS});

      expect(
        chatUtilsMocks.sendErrorPrivateChatMessageMock,
      ).not.toHaveBeenCalled();
      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).toHaveBeenCalled();
    });
  });

  describe('agent advancement', () => {
    it('advances when all mediators declined and trigger is from agent message', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');
      const experiment = {stageIds: ['stage-1', 'stage-2']};

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(experiment);

      await wrapped({params: EVENT_PARAMS});

      // readyToEndChat set
      expect(
        firestoreMocks.getFirestoreParticipantAnswerRefMock,
      ).toHaveBeenCalledWith('exp-1', 'participant-1', 'stage-1');
      expect(firestoreMocks.participantAnswerDocSetMock).toHaveBeenCalledWith(
        {readyToEndChat: true},
        {merge: true},
      );
      // Advanced
      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).toHaveBeenCalledWith('exp-1', participant, experiment.stageIds);
    });

    it('advances when all mediators declined and agent also declined on mediator message', async () => {
      setupMessage({type: UserType.MEDIATOR});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');
      const experiment = {stageIds: ['stage-1', 'stage-2']};

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      // First call: mediator → declined. Second call: agent → declined.
      agentMocks.createAgentChatMessageFromPromptMock
        .mockResolvedValueOnce(AgentMessageResult.DECLINED)
        .mockResolvedValueOnce(AgentMessageResult.DECLINED);
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(experiment);

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).toHaveBeenCalled();
    });

    it('does NOT advance when mediator message triggers and agent sends', async () => {
      setupMessage({type: UserType.MEDIATOR});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      // Mediator declines (canSelfTriggerCalls), agent sends
      agentMocks.createAgentChatMessageFromPromptMock
        .mockResolvedValueOnce(AgentMessageResult.DECLINED)
        .mockResolvedValueOnce(AgentMessageResult.SENT);

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('does NOT advance for human participants', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant({agentConfig: null});
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('does NOT advance when mediator results are mixed', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        createMockMediator('1'),
        createMockMediator('2'),
      ]);
      // Mediator 1 declined, mediator 2 sent
      agentMocks.createAgentChatMessageFromPromptMock
        .mockResolvedValueOnce(AgentMessageResult.DECLINED)
        .mockResolvedValueOnce(AgentMessageResult.SENT);

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('does NOT advance when all mediators return error', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.ERROR,
      );

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('does NOT advance when agent is already on a different stage', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant({currentStageId: 'stage-2'});
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('does NOT advance or set readyToEndChat when experiment is not found', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(null);

      await wrapped({params: EVENT_PARAMS});

      expect(firestoreMocks.participantAnswerDocSetMock).not.toHaveBeenCalled();
      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('advances when multiple mediators all declined and trigger is from agent message', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();
      const experiment = {stageIds: ['stage-1', 'stage-2']};

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        createMockMediator('1'),
        createMockMediator('2'),
        createMockMediator('3'),
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(experiment);

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).toHaveBeenCalled();
    });

    it('does NOT advance when multiple mediators all declined but agent sends on mediator message', async () => {
      setupMessage({type: UserType.MEDIATOR});
      const participant = createMockParticipant();

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        createMockMediator('1'),
        createMockMediator('2'),
      ]);
      // All mediators decline, then agent sends
      agentMocks.createAgentChatMessageFromPromptMock
        .mockResolvedValueOnce(AgentMessageResult.DECLINED)
        .mockResolvedValueOnce(AgentMessageResult.DECLINED)
        .mockResolvedValueOnce(AgentMessageResult.SENT);

      await wrapped({params: EVENT_PARAMS});

      expect(
        participantUtilsMocks.updateParticipantNextStageMock,
      ).not.toHaveBeenCalled();
    });

    it('sets readyToEndChat on answer doc before advancing', async () => {
      setupMessage({type: UserType.PARTICIPANT});
      const participant = createMockParticipant();
      const mediator = createMockMediator('1');
      const experiment = {stageIds: ['stage-1', 'stage-2']};

      firestoreMocks.getFirestoreParticipantMock.mockResolvedValue(participant);
      firestoreMocks.getFirestoreActiveMediatorsMock.mockResolvedValue([
        mediator,
      ]);
      agentMocks.createAgentChatMessageFromPromptMock.mockResolvedValue(
        AgentMessageResult.DECLINED,
      );
      firestoreMocks.getFirestoreExperimentMock.mockResolvedValue(experiment);

      // Track call order
      const callOrder: string[] = [];
      firestoreMocks.participantAnswerDocSetMock.mockImplementation(() => {
        callOrder.push('readyToEndChat');
        return Promise.resolve();
      });
      participantUtilsMocks.updateParticipantNextStageMock.mockImplementation(
        () => {
          callOrder.push('advanceStage');
          return Promise.resolve({
            currentStageId: 'stage-2',
            endExperiment: false,
          });
        },
      );

      await wrapped({params: EVENT_PARAMS});

      expect(callOrder[0]).toBe('readyToEndChat');
      expect(callOrder[1]).toBe('advanceStage');
    });
  });
});
