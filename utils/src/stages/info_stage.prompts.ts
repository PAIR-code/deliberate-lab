import {InfoStageConfig} from './info_stage';
import {getBaseStagePrompt} from './stage.prompts';

/** Get info stage context (e.g., to use in prompt for future stage). */
export function getInfoStagePromptContext(
  stage: InfoStageConfig,
  includeStageInfo: boolean,
) {
  const basePrompt = getBaseStagePrompt(stage, includeStageInfo);
  return `${basePrompt}\n${stage.infoLines.join('\n')}`;
}
