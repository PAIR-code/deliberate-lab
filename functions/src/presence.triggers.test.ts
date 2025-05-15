import firebaseFunctionsTest from 'firebase-functions-test';

// Mock './app' before importing function under test
jest.mock('./app', () => {
  const setMock = jest.fn();
  const getMock = jest.fn().mockResolvedValue({ exists: true });
  const docMock = jest.fn().mockReturnValue({ get: getMock, set: setMock });
  const firestoreMock = jest.fn().mockReturnValue({ doc: docMock });

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

import { mirrorPresenceToFirestore } from './presence.triggers';
// @ts-ignore
import { __mocks__ } from './app';

const testEnv = firebaseFunctionsTest({ projectId: 'deliberate-lab-test' });

describe('mirrorPresenceToFirestore', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates firestore with the connected status from rtdb', async () => {
    const wrapped = testEnv.wrap(mirrorPresenceToFirestore);

    const beforeSnap = testEnv.database.makeDataSnapshot(null, '/status/exp123/user456');
    const afterSnap = testEnv.database.makeDataSnapshot(
      { connected: true, last_changed: 1234567890 },
      '/status/exp123/user456'
    );

    const mockFirestoreProfile = {
      agentConfig: null,
    };

    const { getMock } = __mocks__;
    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => mockFirestoreProfile),
    });

    const change = { before: beforeSnap, after: afterSnap };

    await wrapped(change, {
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
      },
    });

    const { docMock, setMock } = __mocks__;

    expect(docMock).toHaveBeenCalledWith('experiments/exp123/participants/user456');
    expect(setMock).toHaveBeenCalledWith({ connected: true }, { merge: true });
  });

  it('does not mirror presence data for agent participants', async () => {
    const wrapped = testEnv.wrap(mirrorPresenceToFirestore);

    const beforeSnap = testEnv.database.makeDataSnapshot(null, '/status/exp123/user456');
    const afterSnap = testEnv.database.makeDataSnapshot(
      { connected: true, last_changed: 1234567890 },
      '/status/exp123/user456'
    );

    const mockFirestoreProfile = {
      agentConfig: { role: 'observer' },
    };

    const { getMock } = __mocks__;
    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => mockFirestoreProfile),
    });

    const change = { before: beforeSnap, after: afterSnap };

    await wrapped(change, {
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
      },
    });

    const { docMock, setMock } = __mocks__;

    expect(docMock).toHaveBeenCalledWith('experiments/exp123/participants/user456');
    expect(setMock).not.toHaveBeenCalled();
  });
});
