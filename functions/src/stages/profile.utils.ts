import {
  BasePromptConfig,
  ModelResponseStatus,
  ParticipantProfileExtended,
  ProfileType,
  ProfileStageConfig,
  StructuredOutputDataType,
  createDefaultPromptFromText,
  createModelGenerationConfig,
  createStructuredOutputConfig,
} from '@deliberation-lab/utils';

import {processModelResponse} from '../agent.utils';
import {getExperimenterDataFromExperiment} from '../utils/firestore';
import {getStructuredPrompt} from '../prompt.utils';

const PROFILE_DEFAULT_PROMPT =
  'Please fill out your profile name, emoji, and pronouns.';

const PROFILE_STRUCTURED_OUTPUT_CONFIG = createStructuredOutputConfig({
  schema: {
    type: StructuredOutputDataType.OBJECT,
    properties: [
      {
        name: 'name',
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'Your name',
        },
      },
      {
        name: 'emoji',
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'A single emoji to be used as your avatar',
        },
      },
      {
        name: 'pronouns',
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'Your pronouns (either she/her, he/him, they/them, or something else similar)',
        },
      },
    ],
  },
});

export async function completeProfile(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageConfig: ProfileStageConfig,
) {
  if (
    !participant.agentConfig ||
    stageConfig.profileType === ProfileType.ANONYMOUS_ANIMAL ||
    stageConfig.profileType === ProfileType.ANONYMOUS_PARTICIPANT
  ) {
    return;
  }
  const agentConfig = participant.agentConfig;

  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) return;

  const promptConfig: BasePromptConfig = {
    id: stageConfig.id,
    type: stageConfig.kind,
    prompt: createDefaultPromptFromText(PROFILE_DEFAULT_PROMPT, stageConfig.id),
    generationConfig: createModelGenerationConfig(),
    structuredOutputConfig: PROFILE_STRUCTURED_OUTPUT_CONFIG,
    numRetries: 0,
  };
  const structuredPrompt = await getStructuredPrompt(
    experimentId,
    participant.currentCohortId,
    /*participantIds=*/ [participant.privateId],
    stageConfig.id,
    participant,
    agentConfig,
    promptConfig,
  );

  const response = await processModelResponse(
    experimentId,
    participant.currentCohortId,
    /*participantId=*/ participant.privateId,
    stageConfig.id,
    participant,
    participant.publicId,
    participant.privateId,
    /*description=*/ '',
    experimenterData.apiKeys,
    structuredPrompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
    promptConfig.numRetries ?? 0,
  );

  if (response.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return;
  }

  if (!response.parsedResponse) {
    // Response is already logged in console during Gemini API call
    console.log('Could not parse JSON!');
    return;
  }

  const parsed = response.parsedResponse;
  if (parsed['name']) {
    participant.name = parsed['name'].trim();
  }
  if (parsed['emoji']) {
    participant.avatar = parsed['emoji'].trim();
  }
  if (parsed['pronouns']) {
    participant.pronouns = parsed['pronouns'].trim();
  }
}
