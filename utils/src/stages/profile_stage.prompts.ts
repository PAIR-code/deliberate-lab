import {PROFILE_AVATARS} from '../profile_sets';
import {
  StructuredOutputDataType,
  createStructuredOutputConfig,
} from '../structured_output';
import {ProfileType} from './profile_stage';

export const DEFAULT_GENDERED_PROMPT_SUFFIX =
  'Pick your emoji from this list and return only one character:';

export const PROFILE_DEFAULT_PROMPT =
  'Please fill out your profile name, emoji, and pronouns.';

export function createProfilePrompt(profileType: ProfileType): string {
  if (profileType !== ProfileType.DEFAULT_GENDERED) {
    return PROFILE_DEFAULT_PROMPT;
  }
  const emojiList = PROFILE_AVATARS.join(' ');
  return `${PROFILE_DEFAULT_PROMPT}${DEFAULT_GENDERED_PROMPT_SUFFIX}${emojiList}.`;
}

export function createProfileStructuredOutputConfig(profileType: ProfileType) {
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
