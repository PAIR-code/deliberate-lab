import firebaseFunctionsTest from 'firebase-functions-test';

// Mock './app' before importing function under test
jest.mock('./app', () => {
  const setMock = jest.fn();
  const getMock = jest.fn().mockResolvedValue({exists: true});
  const docMock = jest.fn().mockReturnValue({get: getMock, set: setMock});
  const firestoreMock = jest.fn().mockReturnValue({doc: docMock});

  // Expose mocks via module-scoped object for assertions
  return {
    __esModule: true,
    app: {
      firestore: firestoreMock,
    },
    __mocks__: {
      firestoreMock,
      docMock,
      setMock,
      getMock,
    },
  };
});

import {mirrorPresenceToFirestore} from './presence.triggers';
// @ts-expect-error __mocks__ doesn't exist on the real app module, it's just for accessing mocks
import {__mocks__} from './app';
import {DataSnapshot} from 'firebase-admin/database';
import {Change} from 'firebase-functions/v1';

const testEnv = firebaseFunctionsTest({projectId: 'deliberate-lab-test'});

describe('mirrorPresenceToFirestore', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  interface MockParent {
    once: jest.Mock<
      Promise<{
        val: () => Record<string, {connected: boolean; last_changed: number}>;
      }>
    >;
    child: jest.Mock<{set: jest.Mock}>;
  }

  interface MockSnapshot {
    ref: {parent: MockParent};
    val: () => {connected: boolean; last_changed: number};
  }

  let beforeSnap: MockSnapshot;
  let afterSnap: MockSnapshot;
  let change: {before: typeof beforeSnap; after: typeof afterSnap};

  beforeEach(() => {
    const parentVal = {
      conn789: {connected: true, last_changed: 1234567890},
      conn456: {connected: false, last_changed: 1234560000},
      _aggregate: {state: 'offline', ts: 1234560000},
    };
    const mockParent: MockParent = {
      once: jest.fn().mockResolvedValue({val: () => parentVal}),
      child: jest.fn().mockReturnValue({set: jest.fn()}),
    };

    afterSnap = {
      ref: {parent: mockParent},
      val: () => ({connected: true, last_changed: 1234567890}),
    } as MockSnapshot;

    beforeSnap = afterSnap; // before is not actually used

    // @ts-expect-error Change type is not compatible with DataSnapshot, but this is just a mock
    change = {before: beforeSnap, after: afterSnap} as Change<DataSnapshot>;
  });

  it('updates firestore with the connected status from rtdb', async () => {
    const {getMock, docMock, setMock} = __mocks__;
    const wrapped = testEnv.wrap(mirrorPresenceToFirestore);

    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => ({connected: true})),
    });

    await wrapped(change, {
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
        connectionId: 'conn789',
      },
    });

    expect(docMock).toHaveBeenCalledWith(
      'experiments/exp123/participants/user456',
    );
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({connected: true}),
      {merge: true},
    );
  });

  it('does not mirror presence data for agent participants', async () => {
    const {getMock, docMock, setMock} = __mocks__;
    const wrapped = testEnv.wrap(mirrorPresenceToFirestore);

    const mockFirestoreProfile = {
      agentConfig: {role: 'observer'},
    };

    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => mockFirestoreProfile),
    });

    await wrapped(change, {
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
        connectionId: 'conn789',
      },
    });

    expect(docMock).toHaveBeenCalledWith(
      'experiments/exp123/participants/user456',
    );
    expect(setMock).not.toHaveBeenCalled();
  });
});
