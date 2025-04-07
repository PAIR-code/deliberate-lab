import {InfoStageConfig} from './info_stage';
import {getBaseStagePrompt} from './stage.prompts';

export function getInfoStagePrompt(
  stage: InfoStageConfig,
  includeStageInfo: boolean,
) {
  const basePrompt = getBaseStagePrompt(stage, includeStageInfo);
  return `${basePrompt}\n${stage.infoLines.join('\n')}`;
}
