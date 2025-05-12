import { handleAutomaticTransfer } from './participant.utils';
import { ParticipantStatus, TransferStageConfig, StageKind } from '@deliberation-lab/utils';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => {
  const firestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: [],
    }),
    set: jest.fn(),
    update: jest.fn(),
  };
  return {
    firestore: jest.fn(() => firestore),
    initializeApp: jest.fn(),
  };
});

describe('handleAutomaticTransfer', () => {
  it('should create a new cohort and transfer participants if conditions are met', async () => {
    const transaction = {
      get: jest.fn().mockResolvedValue({
        data: () => ({
          participantAnswerMap: {
            participant1: ['answer1'],
          },
        }),
      }),
      set: jest.fn(),
      update: jest.fn(),
    };

    const experimentId = 'experiment1';
    const stageConfig: TransferStageConfig = {
      id: 'stage1',
      kind: StageKind.TRANSFER,
      enableTimeout: false,
      timeoutSeconds: 600,
      participantCounts: {
        '["answer1"]': 1,
      },
    };
    const participantId = 'participant1';

    await handleAutomaticTransfer(transaction as any, experimentId, stageConfig, participantId);

    expect(transaction.set).toHaveBeenCalled();
    expect(transaction.update).toHaveBeenCalled();
  });

  it('should not create a cohort if conditions are not met', async () => {
    const transaction = {
      get: jest.fn().mockResolvedValue({
        data: () => ({
          participantAnswerMap: {},
        }),
      }),
      set: jest.fn(),
      update: jest.fn(),
    };

    const experimentId = 'experiment1';
    const stageConfig: TransferStageConfig = {
      id: 'stage1',
      kind: StageKind.TRANSFER,
      enableTimeout: false,
      timeoutSeconds: 600,
      participantCounts: {
        '["answer1"]': 1,
      },
    };
    const participantId = 'participant1';

    await handleAutomaticTransfer(transaction as any, experimentId, stageConfig, participantId);

    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });
});