import {TOSStageConfig} from './tos_stage';
import {getBaseStagePrompt} from './stage.prompts';

export function getTOSStagePrompt(
  stage: TOSStageConfig,
  includeStageInfo: boolean,
) {
  // TODO: Option to skip TOS content as agent might not need it?
  const basePrompt = getBaseStagePrompt(stage, includeStageInfo);
  return `${basePrompt}\n${stage.tosLines.join('\n')}`;
}
