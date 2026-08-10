import firebaseFunctionsTest from 'firebase-functions-test';
import {HttpsError} from 'firebase-functions/v2/https';

// Mock App and Firestore
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);

// A deep fluent mock helper for Firestore
const mockDocFn = jest.fn();
const mockCollectionFn = jest.fn();

mockDocFn.mockImplementation((path: string) => {
  return {
    get: async () => mockGet(path),
    set: mockSet,
    collection: mockCollectionFn,
  };
});

mockCollectionFn.mockImplementation((_name: string) => {
  return {
    doc: mockDocFn,
    collection: mockCollectionFn,
  };
});

jest.mock('./app', () => ({
  app: {
    firestore: () => ({
      collection: mockCollectionFn,
      doc: mockDocFn,
    }),
  },
}));

// Provide stable thought ID
jest.mock('@deliberation-lab/utils', () => {
  const original = jest.requireActual('@deliberation-lab/utils');
  return {
    ...original,
    generateId: () => 'mocked-thought-id',
  };
});

import {submitParticipantThought} from './participant.endpoints';

const testEnv = firebaseFunctionsTest({projectId: 'deliberate-lab-test'});

describe('submitParticipantThought endpoint', () => {
  let wrapped: (req: {data: unknown}) => Promise<unknown>;

  beforeAll(() => {
    wrapped = testEnv.wrap(submitParticipantThought) as (req: {
      data: unknown;
    }) => Promise<unknown>;
  });

  beforeEach(() => {
    // Default valid scenario mocks
    mockGet.mockImplementation((id) => {
      if (id === 'exp-123') {
        return {exists: true, data: () => ({})};
      }
      if (id === 'part-456') {
        return {
          exists: true,
          data: () => ({isObserver: true, isQuizzed: true}),
        };
      }
      if (id === 'stage-789') {
        return {exists: true, data: () => ({})};
      }
      return {exists: false};
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('successfully saves a trimmed thought to the database', async () => {
    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: '   My private observation thought!   ',
    };

    const response = await wrapped({data});

    expect(response).toEqual({success: true});

    // Verify correct collection/doc calls
    expect(mockCollectionFn).toHaveBeenCalledWith('experiments');
    expect(mockDocFn).toHaveBeenCalledWith('exp-123');
    expect(mockCollectionFn).toHaveBeenCalledWith('participants');
    expect(mockDocFn).toHaveBeenCalledWith('part-456');
    expect(mockCollectionFn).toHaveBeenCalledWith('stageData');
    expect(mockDocFn).toHaveBeenCalledWith('stage-789');
    expect(mockCollectionFn).toHaveBeenCalledWith('thoughts');
    expect(mockDocFn).toHaveBeenCalledWith('mocked-thought-id');

    // Verify exact saved payload: trimmed text and auto timestamp
    expect(mockSet).toHaveBeenCalledWith({
      id: 'mocked-thought-id',
      text: 'My private observation thought!',
      timestamp: expect.any(Object), // Timestamp.now()
    });
  });

  it('fails if the experiment does not exist', async () => {
    mockGet.mockImplementation((id) => {
      if (id === 'exp-123') {
        return {exists: false}; // Experiment not found
      }
      return {
        exists: true,
        data: () => ({isObserver: true, isQuizzed: true}),
      };
    });

    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: 'Valid text',
    };

    await expect(wrapped({data})).rejects.toThrow(
      new HttpsError('not-found', 'Experiment not found'),
    );
  });

  it('fails if the participant does not exist', async () => {
    mockGet.mockImplementation((id) => {
      if (id === 'exp-123') {
        return {exists: true, data: () => ({})};
      }
      if (id === 'part-456') {
        return {exists: false}; // Participant not found
      }
      return {exists: true, data: () => ({})};
    });

    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: 'Valid text',
    };

    await expect(wrapped({data})).rejects.toThrow(
      new HttpsError('not-found', 'Participant not found'),
    );
  });

  it('fails if the stage does not exist', async () => {
    mockGet.mockImplementation((id) => {
      if (id === 'exp-123') {
        return {exists: true, data: () => ({})};
      }
      if (id === 'part-456') {
        return {
          exists: true,
          data: () => ({isObserver: true, isQuizzed: true}),
        };
      }
      if (id === 'stage-789') {
        return {exists: false}; // Stage not found
      }
      return {exists: false};
    });

    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: 'Valid text',
    };

    await expect(wrapped({data})).rejects.toThrow(
      new HttpsError('not-found', 'Stage not found'),
    );
  });

  it("fails if the participant's treatment does not include the quiz", async () => {
    mockGet.mockImplementation((id) => {
      if (id === 'exp-123') {
        return {exists: true, data: () => ({})};
      }
      if (id === 'part-456') {
        return {exists: true, data: () => ({isObserver: false})}; // Treatment without the quiz
      }
      if (id === 'stage-789') {
        return {exists: true, data: () => ({})};
      }
      return {exists: false};
    });

    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: 'Valid text',
    };

    await expect(wrapped({data})).rejects.toThrow(
      new HttpsError(
        'permission-denied',
        "Participant's treatment does not include the quiz",
      ),
    );
  });

  it('fails when input is invalid or missing required fields', async () => {
    const invalidData = {
      experimentId: 'exp-123',
      participantId: '', // Invalid empty string
      stageId: 'stage-789',
      text: 'Valid text',
    };

    await expect(wrapped({data: invalidData})).rejects.toThrow(
      new HttpsError('invalid-argument', 'Invalid data'),
    );
  });

  it('fails when text is empty or all whitespaces', async () => {
    const data = {
      experimentId: 'exp-123',
      participantId: 'part-456',
      stageId: 'stage-789',
      text: '    ', // Only whitespaces
    };

    await expect(wrapped({data})).rejects.toThrow(
      new HttpsError('invalid-argument', 'Text cannot be empty'),
    );
  });
});
