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
  PROFILE_AVATARS,
} from '@deliberation-lab/utils';

import {processModelResponse} from '../agent.utils';
import {getExperimenterDataFromExperiment} from '../utils/firestore';
import {getPromptFromConfig} from '../structured_prompt.utils';

const DEFAULT_GENDERED_PROMPT_SUFFIX =
  ' Pick your emoji from this list and return only one character: ';

const PROFILE_DEFAULT_PROMPT =
  'Please fill out your profile name, emoji, and pronouns.';

function createProfilePrompt(profileType: ProfileType): string {
  if (profileType !== ProfileType.DEFAULT_GENDERED) {
    return PROFILE_DEFAULT_PROMPT;
  }
  const emojiList = PROFILE_AVATARS.join(' ');
  return `${PROFILE_DEFAULT_PROMPT}${DEFAULT_GENDERED_PROMPT_SUFFIX}${emojiList}.`;
}

function createProfileStructuredOutputConfig(profileType: ProfileType) {
  return createStructuredOutputConfig({
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
            enumItems:
              profileType === ProfileType.DEFAULT_GENDERED
                ? [...PROFILE_AVATARS]
                : undefined,
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
}

export async function completeProfile(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageConfig: ProfileStageConfig,
) {
  const stageProfileType = stageConfig.profileType as ProfileType;

  if (
    !participant.agentConfig ||
    stageProfileType === ProfileType.ANONYMOUS_ANIMAL ||
    stageProfileType === ProfileType.ANONYMOUS_PARTICIPANT
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
    prompt: createDefaultPromptFromText(
      createProfilePrompt(stageProfileType),
      stageConfig.id,
    ),
    generationConfig: createModelGenerationConfig(),
    structuredOutputConfig:
      createProfileStructuredOutputConfig(stageProfileType),
    numRetries: 0,
  };
  const structuredPrompt = await getPromptFromConfig(
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

  const parsed = response.parsedResponse as Record<string, unknown>;

  const name = parsed['name'];
  if (typeof name === 'string') {
    participant.name = name.trim();
  }

  const emojiValue = parsed['emoji'];
  if (typeof emojiValue === 'string') {
    const emoji = emojiValue.trim();
    if (stageProfileType !== ProfileType.DEFAULT_GENDERED) {
      participant.avatar = emoji;
    } else if (!PROFILE_AVATARS.includes(emoji)) {
      const fallbackEmoji =
        PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)];
      console.warn(
        `LLM returned emoji outside default gendered set: ${emoji}. Using fallback ${fallbackEmoji}.`,
      );
      participant.avatar = fallbackEmoji;
    } else {
      participant.avatar = emoji;
    }
  }

  const pronouns = parsed['pronouns'];
  if (typeof pronouns === 'string') {
    participant.pronouns = pronouns.trim();
  }
}
