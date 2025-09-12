
import {
  AgentConfig,
  ModelResponseStatus,
  ModelSettings,
  ParticipantProfileExtended,
  ParticipantTimeouts,
  ProfileStageConfig,
  ProfileType,
  StageKind,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';

import * as firestoreUtils from '../utils/firestore';
import * as agentUtils from '../agent.utils';
import * as promptUtils from '../prompt.utils';
import {completeProfile} from './profile.utils';

describe('stages/profile.utils', () => {
  describe('completeProfile', () => {
    const experimentId = 'test-experiment';

    const defaultParticipant: ParticipantProfileExtended = {
      publicId: 'participant-1',
      privateId: 'private-1',
      currentStageId: 'profile-stage',
      currentCohortId: 'cohort-1',
      agentConfig: {
        id: 'agent-1',
        name: 'Test Agent',
        promptContext: 'You are a helpful assistant.',
        modelSettings: {
          model: 'gemini-pro',
        } as ModelSettings,
      } as AgentConfig,
      name: 'Initial Name',
      avatar: '🤔',
      pronouns: 'she/her',
      isTyping: false,
      lastActive: {seconds: 0, nanoseconds: 0} as UnifiedTimestamp,
      timeouts: {} as ParticipantTimeouts,
      readyToEnd: false,
    };

    const defaultStageConfig: ProfileStageConfig = {
      id: 'profile-stage',
      kind: StageKind.PROFILE,
      name: 'Profile Stage',
      profileType: ProfileType.DEFAULT,
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update participant profile with model response', async () => {
      const participant = {
        ...defaultParticipant,
        name: '',
        avatar: '',
        pronouns: '',
      };
      const stageConfig = {...defaultStageConfig};

      jest
        .spyOn(firestoreUtils, 'getExperimenterDataFromExperiment')
        .mockResolvedValue({
          apiKeys: {gemini: 'test-api-key'},
        });

      jest
        .spyOn(promptUtils, 'getStructuredPrompt')
        .mockResolvedValue('test-prompt');

      const mockResponse = {
        status: ModelResponseStatus.OK,
        parsedResponse: {
          name: 'Test Name',
          emoji: '😊',
          pronouns: 'they/them',
        },
      };
      jest
        .spyOn(agentUtils, 'processModelResponse')
        .mockResolvedValue(mockResponse);

      await completeProfile(experimentId, participant, stageConfig);

      expect(participant.name).toEqual('Test Name');
      expect(participant.avatar).toEqual('😊');
      expect(participant.pronouns).toEqual('they/them');
    });

    it('should not update profile if agentConfig is missing', async () => {
      const getExperimenterDataSpy = jest.spyOn(
        firestoreUtils,
        'getExperimenterDataFromExperiment',
      );
      const processModelResponseSpy = jest.spyOn(
        agentUtils,
        'processModelResponse',
      );

      const participant = {...defaultParticipant, agentConfig: undefined};
      const stageConfig = {...defaultStageConfig};

      await completeProfile(experimentId, participant, stageConfig);

      expect(participant.name).toEqual('Initial Name');
      expect(participant.avatar).toEqual('🤔');
      expect(participant.pronouns).toEqual('she/her');
      expect(getExperimenterDataSpy).not.toHaveBeenCalled();
      expect(processModelResponseSpy).not.toHaveBeenCalled();
    });

    it('should not update profile for anonymous profile types', async () => {
      const getExperimenterDataSpy = jest.spyOn(
        firestoreUtils,
        'getExperimenterDataFromExperiment',
      );
      const processModelResponseSpy = jest.spyOn(
        agentUtils,
        'processModelResponse',
      );

      const participant = {...defaultParticipant};
      const stageConfig = {
        ...defaultStageConfig,
        profileType: ProfileType.ANONYMOUS_ANIMAL,
      };

      await completeProfile(experimentId, participant, stageConfig);

      expect(participant.name).toEqual('Initial Name');
      expect(participant.avatar).toEqual('🤔');
      expect(participant.pronouns).toEqual('she/her');
      expect(getExperimenterDataSpy).not.toHaveBeenCalled();
      expect(processModelResponseSpy).not.toHaveBeenCalled();
    });

    it('should handle model response error', async () => {
      const participant = {...defaultParticipant};
      const stageConfig = {...defaultStageConfig};

      jest
        .spyOn(firestoreUtils, 'getExperimenterDataFromExperiment')
        .mockResolvedValue({
          apiKeys: {gemini: 'test-api-key'},
        });

      jest
        .spyOn(promptUtils, 'getStructuredPrompt')
        .mockResolvedValue('test-prompt');

      const mockResponse = {
        status: ModelResponseStatus.ERROR,
      };
      jest
        .spyOn(agentUtils, 'processModelResponse')
        .mockResolvedValue(mockResponse);

      await completeProfile(experimentId, participant, stageConfig);

      expect(participant.name).toEqual('Initial Name');
      expect(participant.avatar).toEqual('🤔');
      expect(participant.pronouns).toEqual('she/her');
    });
  });
});
