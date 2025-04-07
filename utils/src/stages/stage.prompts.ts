import {StageConfig} from './stage';

export function getBaseStagePrompt(
  stage: StageConfig,
  includeStageInfo: boolean,
) {
  const promptContext = [`Stage Name: ${stage.name}`];
  if (includeStageInfo) {
    addStagePrimaryTextPrompt(stage, promptContext);
    addStageInfoTextPrompt(stage, promptContext);
    addStageHelpTextPrompt(stage, promptContext);
  }

  return promptContext.join('\n');
}

function addStagePrimaryTextPrompt(
  stage: StageConfig,
  promptContext: string[],
) {
  if (stage.descriptions.primaryText) {
    promptContext.push(
      `- Stage description: ${stage.descriptions.primaryText}`,
    );
  }
}

function addStageInfoTextPrompt(stage: StageConfig, promptContext: string[]) {
  if (stage.descriptions.infoText) {
    promptContext.push(
      `- Additional information: ${stage.descriptions.infoText}`,
    );
  }
}

function addStageHelpTextPrompt(stage: StageConfig, promptContext: string[]) {
  if (stage.descriptions.helpText) {
    promptContext.push(
      `- If you need assistance: ${stage.descriptions.infoText}`,
    );
  }
}
