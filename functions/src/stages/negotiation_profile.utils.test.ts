import {
  NEGOTIATION_PROFILE_SET_ID,
  NegotiationProfileStageConfig,
  NegotiationProfileStagePublicData,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  UserType,
} from '@deliberation-lab/utils';

// Mock dependencies
const mockGetStage = jest.fn();
const mockGetActiveParticipants = jest.fn();
const mockGetPublicDataRef = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('../utils/firestore', () => ({
  getFirestoreStage: (...args: unknown[]) => mockGetStage(...args),
  getFirestoreActiveParticipants: (...args: unknown[]) =>
    mockGetActiveParticipants(...args),
  getFirestoreStagePublicDataRef: (...args: unknown[]) =>
    mockGetPublicDataRef(...args),
}));

const mockParticipantDocSet = jest.fn();
const mockPublicDocSet = jest.fn();
const mockCollection = jest.fn();

jest.mock('../app', () => ({
  app: {
    firestore: () => ({
      runTransaction: (
        cb: (transaction: {get: jest.Mock; set: jest.Mock}) => Promise<unknown>,
      ) => mockRunTransaction(cb),
      collection: mockCollection,
    }),
  },
}));

import {assignNegotiationProfilesToParticipants} from './negotiation_profile.utils';

describe('assignNegotiationProfilesToParticipants', () => {
  const experimentId = 'exp1';
  const cohortId = 'cohort1';
  const stageId = 'stage1';

  const mockStage: NegotiationProfileStageConfig = {
    id: stageId,
    kind: StageKind.NEGOTIATION_PROFILE,
    name: 'Negotiation Profile',
    descriptions: {primaryText: '', infoText: '', authorText: ''},
    progress: {showParticipantProgress: false},
    items: [
      {
        id: 'party-a',
        name: 'Party A',
        avatar: '🔴',
        displayLines: ['Party A description'],
      },
      {
        id: 'party-b',
        name: 'Party B',
        avatar: '🔵',
        displayLines: ['Party B description'],
      },
      {
        id: 'party-c',
        name: 'Party C',
        avatar: '🟢',
        displayLines: ['Party C description'],
      },
    ],
  };

  const createParticipant = (
    publicId: string,
    privateId: string,
  ): ParticipantProfileExtended => ({
    id: privateId,
    privateId,
    publicId,
    type: UserType.PARTICIPANT,
    name: `User ${publicId}`,
    avatar: '😀',
    pronouns: '',
    currentCohortId: cohortId,
    currentExperimentId: experimentId,
    currentStageId: stageId,
    currentStatus: ParticipantStatus.IN_PROGRESS,
    timestamps: {
      accountCreated: {seconds: 0, nanoseconds: 0},
      lastLogin: {seconds: 0, nanoseconds: 0},
      startExperiment: {seconds: 0, nanoseconds: 0},
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success: false if stage is not NEGOTIATION_PROFILE', async () => {
    mockGetStage.mockResolvedValue({
      id: stageId,
      kind: StageKind.SURVEY,
    });

    const result = await assignNegotiationProfilesToParticipants(
      experimentId,
      cohortId,
      stageId,
    );

    expect(result).toEqual({success: false});
  });

  it('should assign balanced negotiation profiles (Party A, Party B) to participants', async () => {
    mockGetStage.mockResolvedValue(mockStage);

    const p1 = createParticipant('pub1', 'priv1');
    const p2 = createParticipant('pub2', 'priv2');
    mockGetActiveParticipants.mockResolvedValue([p1, p2]);

    const publicStageData: NegotiationProfileStagePublicData = {
      id: stageId,
      kind: StageKind.NEGOTIATION_PROFILE,
      participantMap: {},
    };

    const mockPublicDocSnapshot = {
      exists: true,
      data: () => publicStageData,
    };

    const mockParticipant1Snapshot = {
      exists: true,
      data: () => ({...p1}),
    };

    const mockParticipant2Snapshot = {
      exists: true,
      data: () => ({...p2}),
    };

    mockGetPublicDataRef.mockReturnValue('publicDocRef');

    mockCollection.mockImplementation(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn((docId) => `participantDocRef_${docId}`),
        })),
      })),
    }));

    mockRunTransaction.mockImplementation(async (cb) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref) => {
          if (ref === 'publicDocRef') return mockPublicDocSnapshot;
          if (ref === 'participantDocRef_priv1')
            return mockParticipant1Snapshot;
          if (ref === 'participantDocRef_priv2')
            return mockParticipant2Snapshot;
          return {exists: false};
        }),
        set: jest.fn().mockImplementation((ref, val) => {
          if (ref === 'publicDocRef') mockPublicDocSet(val);
          if (ref === 'participantDocRef_priv1')
            mockParticipantDocSet('priv1', val);
          if (ref === 'participantDocRef_priv2')
            mockParticipantDocSet('priv2', val);
        }),
      };
      return await cb(transaction);
    });

    const result = await assignNegotiationProfilesToParticipants(
      experimentId,
      cohortId,
      stageId,
    );

    expect(result).toEqual({success: true});
    expect(mockGetActiveParticipants).toHaveBeenCalledWith(
      experimentId,
      cohortId,
    );
    expect(publicStageData.participantMap['pub1']).toBe('party-a');
    expect(publicStageData.participantMap['pub2']).toBe('party-b');

    expect(mockParticipantDocSet).toHaveBeenCalledWith('priv1', {
      ...p1,
      anonymousProfiles: {
        [NEGOTIATION_PROFILE_SET_ID]: {
          name: 'Party A',
          avatar: '😀',
          repeat: 0,
        },
      },
    });

    expect(mockParticipantDocSet).toHaveBeenCalledWith('priv2', {
      ...p2,
      anonymousProfiles: {
        [NEGOTIATION_PROFILE_SET_ID]: {
          name: 'Party B',
          avatar: '😀',
          repeat: 0,
        },
      },
    });
  });

  it('should preserve existing assignments and assign next available profile to new participants', async () => {
    mockGetStage.mockResolvedValue(mockStage);

    const p1 = createParticipant('pub1', 'priv1');
    const p2 = createParticipant('pub2', 'priv2');
    mockGetActiveParticipants.mockResolvedValue([p1, p2]);

    const publicStageData: NegotiationProfileStagePublicData = {
      id: stageId,
      kind: StageKind.NEGOTIATION_PROFILE,
      participantMap: {
        pub1: 'party-a', // pub1 already assigned Party A
      },
    };

    const mockPublicDocSnapshot = {
      exists: true,
      data: () => publicStageData,
    };

    const mockParticipant2Snapshot = {
      exists: true,
      data: () => ({...p2}),
    };

    mockGetPublicDataRef.mockReturnValue('publicDocRef');

    mockCollection.mockImplementation(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn((docId) => `participantDocRef_${docId}`),
        })),
      })),
    }));

    mockRunTransaction.mockImplementation(async (cb) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref) => {
          if (ref === 'publicDocRef') return mockPublicDocSnapshot;
          if (ref === 'participantDocRef_priv2')
            return mockParticipant2Snapshot;
          return {exists: false};
        }),
        set: jest.fn().mockImplementation((ref, val) => {
          if (ref === 'publicDocRef') mockPublicDocSet(val);
          if (ref === 'participantDocRef_priv2')
            mockParticipantDocSet('priv2', val);
        }),
      };
      return await cb(transaction);
    });

    const result = await assignNegotiationProfilesToParticipants(
      experimentId,
      cohortId,
      stageId,
    );

    expect(result).toEqual({success: true});
    expect(publicStageData.participantMap['pub1']).toBe('party-a');
    expect(publicStageData.participantMap['pub2']).toBe('party-b');
    expect(mockParticipantDocSet).toHaveBeenCalledWith('priv2', {
      ...p2,
      anonymousProfiles: {
        [NEGOTIATION_PROFILE_SET_ID]: {
          name: 'Party B',
          avatar: '😀',
          repeat: 0,
        },
      },
    });
  });
});
