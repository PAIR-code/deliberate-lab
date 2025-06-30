import {
  ParticipantProfileExtended,
  ProfileType,
  ProfileStageConfig,
  StructuredOutputDataType,
  createModelGenerationConfig,
  createStructuredOutputConfig,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall} from 'firebase-functions/v2/https';

import {ModelResponseStatus} from '../api/model.response';
import {app} from '../app';
import {getAgentResponse} from '../agent.utils';
import {getExperimenterDataFromExperiment} from '../utils/firestore';
import {getPastStagesPromptContext} from './stage.utils';

const PROFILE_STRUCTURED_OUTPUT_CONFIG = createStructuredOutputConfig({
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
});

export async function completeProfile(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageConfig: ProfileStageConfig,
) {
  if (
    !participant.agentConfig ||
    stageConfig.profileType === ProfileType.ANONYMOUS_ANIMAL
  ) {
    return;
  }

  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) return null;

  const response = await getAgentResponse(
    experimenterData.apiKeys,
    `${participant.agentConfig.promptContext}\n\nPlease fill out your profile name, emoji, and pronouns.`,
    participant.agentConfig.modelSettings,
    createModelGenerationConfig(),
    PROFILE_STRUCTURED_OUTPUT_CONFIG,
  );

  if (response.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return;
  }

  let parsed = '';
  try {
    const cleanedText = response.text!.replace(/```json\s*|\s*```/g, '').trim();
    parsed = JSON.parse(JSON.parse(cleanedText).response);
  } catch {
    // Response is already logged in console during Gemini API call
    console.log('Could not parse JSON!');
    return null;
  }

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
