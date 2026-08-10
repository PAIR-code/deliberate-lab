/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
import {
  StageKind,
  UserType,
  ChatMessage,
  shuffleWithSeed,
  ParticipantStatus,
} from '@deliberation-lab/utils';

// -----------------------------------------------------------------------------
// MOCK SETUP (hoisted inside jest.mock blocks to avoid temporal dead zone)
// -----------------------------------------------------------------------------

// Mock '@deliberation-lab/utils' to intercept shuffleWithSeed
jest.mock('@deliberation-lab/utils', () => {
  const original = jest.requireActual('@deliberation-lab/utils');
  const mockShuffle = jest
    .fn()
    .mockImplementation((arr: any[], seed?: string) => {
      return original.shuffleWithSeed(arr, seed);
    });
  return {
    __esModule: true,
    ...original,
    shuffleWithSeed: mockShuffle,
  };
});

// Mock './app' before importing function under test
jest.mock('../app', () => {
  const mockSet = jest.fn().mockResolvedValue(undefined);
  const mockDelete = jest.fn().mockResolvedValue(undefined);
  const mockGet = jest.fn().mockImplementation(async (path: string) => {
    if (path.includes('/publicStageData/')) {
      const mockGetFirestoreStagePublicData =
        require('../utils/firestore').getFirestoreStagePublicData;
      const data = await mockGetFirestoreStagePublicData();
      if (data !== undefined && data !== null) {
        return {
          exists: true,
          data: () => data,
        };
      }
    }
    return {
      exists: false,
      data: () => ({}),
    };
  });

  const mockDoc = jest.fn().mockImplementation((path: string) => {
    return {
      path,
      collection: (col: string) => mockCollection(`${path}/${col}`),
      doc: (doc: string) => mockDoc(`${path}/${doc}`),
      set: (data: any, options: any) => mockSet(path, data, options),
      delete: () => mockDelete(path),
      get: () => mockGet(path),
    };
  });

  const mockCollection = jest.fn().mockImplementation((path: string) => {
    return {
      path,
      doc: (doc: string) => mockDoc(`${path}/${doc}`),
      collection: (col: string) => mockCollection(`${path}/${col}`),
    };
  });

  const mockRunTransaction = jest
    .fn()
    .mockImplementation(async (callback: (txn: any) => Promise<any>) => {
      const txn = {
        get: (ref: any) => ref.get(),
        create: (ref: any, data: any) => mockSet(ref.path, data, {}),
        set: (ref: any, data: any, options: any) =>
          mockSet(ref.path, data, options),
        delete: (ref: any) => mockDelete(ref.path),
      };
      return callback(txn);
    });

  const mockFirestore = jest.fn().mockReturnValue({
    collection: (col: string) => mockCollection(col),
    doc: (doc: string) => mockDoc(doc),
    runTransaction: mockRunTransaction,
  });

  return {
    __esModule: true,
    app: {
      firestore: mockFirestore,
    },
    __mocks__: {
      firestoreMock: mockFirestore,
      collectionMock: mockCollection,
      docMock: mockDoc,
      setMock: mockSet,
      deleteMock: mockDelete,
      getMock: mockGet,
    },
  };
});

// Mock firebase-admin/firestore
jest.mock('firebase-admin/firestore', () => {
  return {
    Timestamp: {
      now: jest.fn().mockReturnValue({
        seconds: 1234567890,
        nanoseconds: 0,
      }),
    },
  };
});

// Mock '../stages/chat.time' to prevent background timers and DB updates
jest.mock('../stages/chat.time', () => ({
  startTimeElapsed: jest.fn(),
}));

// Mock '../chat/chat.utils'
jest.mock('../chat/chat.utils', () => ({
  sendErrorPrivateChatMessage: jest.fn(),
  updateParticipantReadyToEndChat: jest.fn(),
  sendSystemChatMessage: jest.fn(),
}));

// Mock '../structured_prompt.utils' to bypass AI querying during internal functions execution
jest.mock('../structured_prompt.utils', () => ({
  getStructuredPromptConfig: jest.fn().mockResolvedValue({
    chatSettings: {
      initialMessage: 'Hello, I am the mediator.',
    },
  }),
  getPromptFromConfig: jest.fn(),
}));

// Mock '../utils/firestore' functions
jest.mock('../utils/firestore', () => {
  // We need to construct a dummy mockDoc for path validation in triggers logs
  const dummyMockDoc = (path: string): any => {
    const {__mocks__} = require('../app');
    return {
      path,
      collection: (col: string) => dummyMockDoc(`${path}/${col}`),
      doc: (docName: string) => dummyMockDoc(`${path}/${docName}`),
      set: (data: any, options: any) => __mocks__.setMock(path, data, options),
      delete: () => __mocks__.deleteMock(path),
      get: () => __mocks__.getMock(path),
    };
  };

  return {
    getFirestoreStage: jest.fn(),
    getFirestoreStagePublicData: jest.fn(),
    getFirestoreActiveParticipants: jest.fn(),
    getFirestoreActiveMediators: jest.fn(),
    getFirestoreParticipant: jest.fn(),
    getGroupChatTriggerLogRef: (
      expId: string,
      cohortId: string,
      stageId: string,
      logId: string,
    ) => {
      return dummyMockDoc(
        `experiments/${expId}/cohorts/${cohortId}/publicStageData/${stageId}/triggerLogs/${logId}`,
      );
    },
    getPrivateChatTriggerLogRef: jest.fn(),
    getFirestoreParticipantAnswerRef: jest.fn(),
    getFirestorePublicStageChatMessages: jest.fn(),
    getFirestorePrivateChatMessages: jest.fn(),
    getAgentMediatorPrompt: jest.fn().mockResolvedValue({}),
    getAgentParticipantPrompt: jest.fn().mockResolvedValue({}),
  };
});

// Mock 'createAgentChatMessageFromPrompt' but keep other parts of '../chat/chat.agent'
jest.mock('../chat/chat.agent', () => {
  const originalModule = jest.requireActual('../chat/chat.agent');
  return {
    ...originalModule,
    createAgentChatMessageFromPrompt: jest
      .fn()
      .mockImplementation(
        async (
          expId: string,
          cohortId: string,
          pIds: string[],
          stageId: string,
          triggerId: string,
          user: any,
        ) => {
          return mockInternalCreateAgentChatMessage(
            expId,
            cohortId,
            pIds,
            stageId,
            triggerId,
            user,
          );
        },
      ),
  };
});

// Keep track of internal calls. By default it is a pure mock returning true.
const mockInternalCreateAgentChatMessage = jest.fn().mockResolvedValue(true);

// -----------------------------------------------------------------------------
// IMPORTS AFTER MOCKS
// -----------------------------------------------------------------------------

import {onPublicChatMessageCreated} from './chat.triggers';
import {sendInitialChatMessages} from '../chat/chat.agent';
import {__mocks__} from '../app';
import {
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreActiveParticipants,
  getFirestoreActiveMediators,
} from '../utils/firestore';

const mockGetFirestoreStage = getFirestoreStage as jest.Mock;
const mockGetFirestoreStagePublicData =
  getFirestoreStagePublicData as jest.Mock;
const mockGetFirestoreActiveParticipants =
  getFirestoreActiveParticipants as jest.Mock;
const mockGetFirestoreActiveMediators =
  getFirestoreActiveMediators as jest.Mock;
const mockShuffleWithSeed = shuffleWithSeed as unknown as jest.Mock;

describe('Chat Triggers - Turn Taking Mechanics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShuffleWithSeed.mockClear();
    mockInternalCreateAgentChatMessage.mockReset();

    // Configure default mock behavior for createAgentChatMessageFromPrompt
    mockInternalCreateAgentChatMessage.mockResolvedValue(true);

    // Default mock implementations
    mockGetFirestoreStage.mockResolvedValue({
      id: 'stage123',
      kind: StageKind.CHAT,
      isTurnBased: true,
      discussions: [],
    });

    mockGetFirestoreActiveParticipants.mockResolvedValue([
      {publicId: 'p1', privateId: 'priv1'},
      {publicId: 'p2', privateId: 'priv2'},
      {publicId: 'p3', privateId: 'priv3'},
    ]);

    mockGetFirestoreActiveMediators.mockResolvedValue([
      {
        publicId: 'm1',
        privateId: 'priv-m1',
        type: UserType.MEDIATOR,
        agentConfig: {agentId: 'mediator-agent'},
      },
    ]);
  });

  // ---------------------------------------------------------------------------
  // 1. TURN INITIALIZATION
  // ---------------------------------------------------------------------------
  describe('1. Turn Initialization', () => {
    it('initializes turn order using shuffleWithSeed when currentTurnParticipantId is null', async () => {
      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: null,
        turnOrder: [],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p1',
        message: 'Hello, let us start.',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert cycleIndex is 0 and seed string matches 'cohortId-cycleIndex'
      expect(mockShuffleWithSeed).toHaveBeenCalledWith(
        ['p1', 'p2', 'p3'],
        'cohort123-stage123-0',
      );

      // Shuffled order from deterministic seed is ['p3', 'p1', 'p2']
      const expectedShuffled = mockShuffleWithSeed.mock.results[0].value;
      const expectedTurnOrder = ['m1', ...expectedShuffled];

      // Assert it updates Firestore with initialized turn order starting with mediator
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: expectedTurnOrder[0],
          turnOrder: expectedTurnOrder,
          cycleIndex: 0,
        },
        {merge: true},
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TURN ADVANCEMENT
  // ---------------------------------------------------------------------------
  describe('2. Turn Advancement', () => {
    it('advances turn to next participant when correct turn-holder sends a message', async () => {
      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p1',
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p1',
        message: 'My turn!',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert that it advances from p1 to p2
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'p2',
          turnOrder: ['m1', 'p1', 'p2', 'p3'],
          cycleIndex: 0,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Assert that it does NOT trigger agent message since p2 is human (no agentConfig)
      expect(mockInternalCreateAgentChatMessage).not.toHaveBeenCalled();
    });

    it('triggers next AI agent when turn advances to an agent participant', async () => {
      // Make p3 an agent participant
      mockGetFirestoreActiveParticipants.mockResolvedValue([
        {publicId: 'p1', privateId: 'priv1'},
        {publicId: 'p2', privateId: 'priv2'},
        {
          publicId: 'p3',
          privateId: 'priv3',
          agentConfig: {agentId: 'ai-agent-3'},
        },
      ]);

      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p2',
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p2',
        message: 'Passing to agent p3',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert turn advances to p3
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'p3',
          turnOrder: ['m1', 'p1', 'p2', 'p3'],
          cycleIndex: 0,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Assert that AI agent for p3 is triggered
      expect(mockInternalCreateAgentChatMessage).toHaveBeenCalledWith(
        'exp123',
        'cohort123',
        ['priv3'],
        'stage123',
        'msg123',
        expect.objectContaining({publicId: 'p3', privateId: 'priv3'}),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PREVENTION OF OUT-OF-TURN ADVANCEMENT
  // ---------------------------------------------------------------------------
  describe('3. Prevention of Out-of-Turn Advancement', () => {
    it('does not advance turn when an out-of-turn participant sends a message', async () => {
      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p2',
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p3', // speaks out of turn (it is p2's turn)
        message: 'Speaking out of turn!',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert the turn did not advance; only the processed message id is
      // recorded
      expect(__mocks__.setMock).toHaveBeenCalledTimes(1);
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {turnProcessedMessageId: 'msg123'},
        {merge: true},
      );
      // Assert no AI agent or mediator was triggered
      expect(mockInternalCreateAgentChatMessage).not.toHaveBeenCalled();
    });

    it("triggers the mediator if it was the mediator's turn but someone else speaks first", async () => {
      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'm1', // mediator's turn
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p1', // speaks out of turn
        message: 'Rushing in before mediator!',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert the turn did not advance; only the processed message id is
      // recorded
      expect(__mocks__.setMock).toHaveBeenCalledTimes(1);
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {turnProcessedMessageId: 'msg123'},
        {merge: true},
      );

      // Assert mediator is triggered to speak the initial message
      expect(mockInternalCreateAgentChatMessage).toHaveBeenCalledWith(
        'exp123',
        'cohort123',
        ['priv1', 'priv2', 'priv3'], // all participants for context
        'stage123',
        '', // empty triggerChatId indicates initial message fallback
        expect.objectContaining({publicId: 'm1', type: UserType.MEDIATOR}),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MEDIATOR AUTO-TRIGGERING
  // ---------------------------------------------------------------------------
  describe('4. Mediator Auto-Triggering', () => {
    it('initializes turn-based chat and triggers mediator', async () => {
      // Mock getFirestoreStagePublicData returning null (meaning uninitialized)
      mockGetFirestoreStagePublicData.mockResolvedValue(null);

      // In this test, we want to run the real createAgentChatMessageFromPrompt internally.
      // By delegating to jest.requireActual in the mock implementation:
      mockInternalCreateAgentChatMessage.mockImplementation(
        async (
          expId: string,
          cohortId: string,
          pIds: string[],
          stageId: string,
          triggerId: string,
          user: any,
        ) => {
          const chatAgentModule = jest.requireActual('../chat/chat.agent');
          return chatAgentModule.createAgentChatMessageFromPrompt(
            expId,
            cohortId,
            pIds,
            stageId,
            triggerId,
            user,
          );
        },
      );

      await sendInitialChatMessages(
        'exp123',
        'cohort123',
        'stage123',
        'priv1', // triggering participant
      );

      // Shuffled order from deterministic seed is ['p3', 'p1', 'p2']
      const expectedShuffled = mockShuffleWithSeed.mock.results[0].value;
      const expectedTurnOrder = ['m1', ...expectedShuffled];

      // Assert initial state is stored in Firestore
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'm1',
          turnOrder: expectedTurnOrder,
          cycleIndex: 0,
        },
        {merge: true},
      );

      // Assert mediator's message is constructed and saved to Firestore chats collection
      const chatsCall = __mocks__.setMock.mock.calls.find((call: any) =>
        call[0].includes('/chats/'),
      );
      expect(chatsCall).toBeDefined();
      expect(chatsCall[1]).toEqual(
        expect.objectContaining({
          message: 'Hello, I am the mediator.',
          senderId: 'm1',
          type: UserType.MEDIATOR,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CYCLE SHUFFLES ON END-OF-CYCLE
  // ---------------------------------------------------------------------------
  describe('5. Cycle Shuffles on End-of-Cycle', () => {
    it('increments cycleIndex, shuffles with seed based on new cycleIndex, and restarts turn order', async () => {
      // Let's set p3 as the current turn holder, which is the last person in turnOrder
      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p3',
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p3', // last person sends a message
        message: 'Wrapping up cycle 0!',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert cycleIndex incremented to 1 and shuffleWithSeed called with seed string 'cohort123-stage123-1'
      expect(mockShuffleWithSeed).toHaveBeenCalledWith(
        ['p1', 'p2', 'p3'],
        'cohort123-stage123-1',
      );

      const expectedShuffled = mockShuffleWithSeed.mock.results[0].value;
      const expectedTurnOrder = ['m1', ...expectedShuffled];

      // Assert turn order reset and database updated with cycleIndex = 1
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'm1', // mediator starts new cycle
          turnOrder: expectedTurnOrder,
          cycleIndex: 1,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Assert mediator is auto-triggered to start the new cycle since it is 'm1''s turn
      expect(mockInternalCreateAgentChatMessage).toHaveBeenCalledWith(
        'exp123',
        'cohort123',
        ['priv1', 'priv2', 'priv3'], // all participants for context
        'stage123',
        'msg123', // message that triggered end-of-cycle
        expect.objectContaining({publicId: 'm1', type: UserType.MEDIATOR}),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PARTICIPANT DROPOUT robustness
  // ---------------------------------------------------------------------------
  describe('6. Participant Dropout Robustness', () => {
    it('Scenario 1: Auto-advance on active speaker dropout', async () => {
      // p2 drops out (so they are NOT returned by getFirestoreActiveParticipants)
      mockGetFirestoreActiveParticipants.mockResolvedValue([
        {publicId: 'p1', privateId: 'priv1'},
        {publicId: 'p3', privateId: 'priv3'},
      ]);

      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p2', // active turn holder dropped out
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p1', // p1 sends a message
        message: 'Hello, is anyone there?',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert turnOrder is cleaned and currentTurnParticipantId advances to next active (p3)
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'p3',
          turnOrder: ['m1', 'p1', 'p3'],
          cycleIndex: 0,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Since the new turn holder is p3 (not p1 who sent the message), we return early and do NOT trigger further AI
      expect(mockInternalCreateAgentChatMessage).not.toHaveBeenCalled();
    });

    it('Scenario 2: Recycle on all remaining speakers dropout', async () => {
      // All remaining speakers (p2 and p3) drop out, leaving only p1
      mockGetFirestoreActiveParticipants.mockResolvedValue([
        {publicId: 'p1', privateId: 'priv1'},
      ]);

      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'p2', // active turn holder dropped out, no remaining speakers
        turnOrder: ['m1', 'p1', 'p2', 'p3'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'p1', // p1 sends a message
        message: 'Hello, is anyone there?',
        type: UserType.PARTICIPANT,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Shuffled active participants (only p1) for cycle 1
      expect(mockShuffleWithSeed).toHaveBeenCalledWith(
        ['p1'],
        'cohort123-stage123-1',
      );

      const expectedShuffled = mockShuffleWithSeed.mock.results[0].value; // ['p1']
      const expectedTurnOrder = ['m1', ...expectedShuffled]; // ['m1', 'p1']

      // Assert turnOrder resets, cycleIndex increments, mediator is currentTurnParticipantId
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'm1',
          turnOrder: expectedTurnOrder,
          cycleIndex: 1,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Assert mediator is auto-triggered!
      expect(mockInternalCreateAgentChatMessage).toHaveBeenCalledWith(
        'exp123',
        'cohort123',
        ['priv1'], // all remaining participants for context
        'stage123',
        '', // empty triggerChatId indicates initial/reset mediator message
        expect.objectContaining({publicId: 'm1', type: UserType.MEDIATOR}),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. OBSERVER TURN TAKING ROBUSTNESS
  // ---------------------------------------------------------------------------
  describe('7. Observer Turn Taking Robustness', () => {
    it('allows turn-taking to continue if there is an observer but zero active participants', async () => {
      mockGetFirestoreActiveParticipants.mockResolvedValue([
        {
          publicId: 'obs1',
          privateId: 'priv-obs1',
          isObserver: true,
          agentConfig: null,
          currentCohortId: 'cohort123',
          currentStageId: 'stage123',
          currentStatus: ParticipantStatus.IN_PROGRESS,
        },
      ]);

      mockGetFirestoreStagePublicData.mockResolvedValue({
        id: 'stage123',
        currentTurnParticipantId: 'm1',
        turnOrder: ['m1'],
        cycleIndex: 0,
      });

      const chatMessage = {
        id: 'msg123',
        senderId: 'm1',
        message: 'Hello observer.',
        type: UserType.MEDIATOR,
        timestamp: {} as any,
      } as ChatMessage;

      const event = {
        data: {
          data: () => chatMessage,
          exists: true,
        },
        params: {
          experimentId: 'exp123',
          cohortId: 'cohort123',
          stageId: 'stage123',
          chatId: 'msg123',
        },
      };

      await onPublicChatMessageCreated.run(event as any);

      // Assert turnOrder stays ['m1'], currentTurnParticipantId stays 'm1', cycleIndex increments to 1
      expect(__mocks__.setMock).toHaveBeenCalledWith(
        'experiments/exp123/cohorts/cohort123/publicStageData/stage123',
        {
          currentTurnParticipantId: 'm1',
          turnOrder: ['m1'],
          cycleIndex: 1,
          turnProcessedMessageId: 'msg123',
        },
        {merge: true},
      );

      // Assert mediator is auto-triggered!
      expect(mockInternalCreateAgentChatMessage).toHaveBeenCalledWith(
        'exp123',
        'cohort123',
        [], // observer is filtered out of recipient private IDs for context
        'stage123',
        'msg123',
        expect.objectContaining({publicId: 'm1', type: UserType.MEDIATOR}),
      );
    });
  });
});
