import {TOSStageConfig} from './tos_stage';
import {getBaseStagePrompt} from './stage.prompts';

/** Get TOS stage context (e.g., to use in prompt for future stage). */
export function getTOSStagePromptContext(
  stage: TOSStageConfig,
  includeStageInfo: boolean,
) {
  // TODO: Option to skip TOS content as agent might not need it?
  const basePrompt = getBaseStagePrompt(stage, includeStageInfo);
  return `${basePrompt}\n${stage.tosLines.join('\n')}`;
}
