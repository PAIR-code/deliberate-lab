import {ParticipantProfileBase} from './participant';

export function getParticipantProfilePromptContext(
  profile: ParticipantProfileBase,
  additionalContext = '',
  includeAvatar = true,
  includePronouns = true,
) {
  const premise = `You are role-playing as a crowd worker participant in a multi-stage online experiment.\n`;
  // Build profile
  const name = profile.name;
  const avatar = includeAvatar && profile.avatar ? `${profile.avatar} ` : '';
  const pronouns =
    includePronouns && profile.pronouns ? ` (${profile.pronouns})` : '';
  const finalProfile = `${avatar}${name}${pronouns}`;
  // TODO: Explain pseudonymous profile if relevant, etc.
  const assignment = `You have been assigned the following profile: ${finalProfile}`;
  // Add custom additional context
  const additional =
    additionalContext.length > 0 ? `\n${additionalContext}` : '';
  return `${premise}${assignment}${additional}`;
}
