import firebaseFunctionsTest from 'firebase-functions-test';

// Mock './app' before importing function under test
jest.mock('../app', () => {
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
import {__mocks__} from '../app';

const testEnv = firebaseFunctionsTest({projectId: 'deliberate-lab-test'});

describe('mirrorPresenceToFirestore', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapped: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let beforeSnap: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let afterSnap: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let change: any;

  beforeEach(() => {
    wrapped = testEnv.wrap(mirrorPresenceToFirestore);

    beforeSnap = testEnv.database.makeDataSnapshot(
      null,
      '/status/exp123/user456',
    );
    afterSnap = testEnv.database.makeDataSnapshot(
      {connected: true, last_changed: 1234567890},
      '/status/exp123/user456',
    );

    change = {before: beforeSnap, after: afterSnap};
  });

  it('updates firestore with the connected status from rtdb', async () => {
    const {getMock, docMock, setMock} = __mocks__;

    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => ({connected: true})),
    });

    await wrapped({
      data: change,
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
      },
    });

    expect(docMock).toHaveBeenCalledWith(
      'experiments/exp123/participants/user456',
    );
    expect(setMock).toHaveBeenCalledWith({connected: true}, {merge: true});
  });

  it('does not mirror presence data for agent participants', async () => {
    const {getMock, docMock, setMock} = __mocks__;

    const mockFirestoreProfile = {
      agentConfig: {role: 'observer'},
    };

    getMock.mockResolvedValueOnce({
      exists: true,
      data: jest.fn(() => mockFirestoreProfile),
    });

    await wrapped({
      data: change,
      params: {
        experimentId: 'exp123',
        participantPrivateId: 'user456',
      },
    });

    expect(docMock).toHaveBeenCalledWith(
      'experiments/exp123/participants/user456',
    );
    expect(setMock).not.toHaveBeenCalled();
  });
});
