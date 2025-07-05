import {
  BasePromptConfig,
  ProfileAgentConfig,
  PromptItem,
  PromptItemType,
  StageConfig,
  StageContextPromptItem,
  StageKind,
  getChatPromptMessageHistory,
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';
import {
  getFirestoreExperiment,
  getFirestoreStage,
  getFirestorePublicStageChatMessages,
} from './utils/firestore';
import {app} from '../app';

// ****************************************************************************
// Helper functions related to assembling structured prompts.
// ****************************************************************************

/** Assemble prompt items into final prompt. */
export async function getStructuredPrompt(
  experimentId: string,
  cohortId: string,
  participantId: string | null, // participant ID or null if mediator
  stageId: string, // current stage ID
  agentConfig: ProfileAgentConfig,
  promptConfig: BasePromptConfig,
) {
  const items: string[] = [];
  for (const promptItem of promptConfig.prompt) {
    switch (promptItem.type) {
      case PromptItemType.TEXT:
        items.push(promptItem.text);
        break;
      case PromptItemType.PROFILE_CONTEXT:
        items.push(agentConfig.promptContext);
        break;
      case PromptItemType.STAGE_CONTEXT:
        items.push(
          await getStageContextForPrompt(
            experimentId,
            cohortId,
            participantId,
            stageId,
            promptItem,
          ),
        );
        break;
      default:
        break;
    }
  }

  // Add structured output if relevant
  items.push(makeStructuredOutputPrompt(promptConfig.structuredOutputConfig));

  return items.join('\n');
}

export async function getStageContextForPrompt(
  experimentId: string,
  cohortId: string,
  participantId: string,
  currentStageId: string,
  item: StageContextPromptItem,
) {
  // Get experiment
  const experiment = await getFirestoreExperiment(experimentId);
  const getStageList = () => {
    const index = experiment.stageIds.findIndex((id) => id === currentStageId);
    return experiment.stageIds.slice(0, index + 1);
  };

  // If stage ID is null, use all stages up to current stage
  const stageList = item.stageId ? [item.stageId] : getStageList();

  // Function to get context for given stage ID
  const getContextForStage = async (stageId) => {
    const stage = await getFirestoreStage(experimentId, stageId);
    const textItems: string[] = [];
    if (item.includePrimaryText) {
      textItems.push(`- Stage description: ${stage.descriptions.primaryText}`);
    }
    if (item.includeInfoText) {
      textItems.push(`- Additional info: ${stage.descriptions.infoText}`);
    }
    if (item.includeHelpText) {
      textItems.push(`- If you need help: ${stage.descriptions.helpText}`);
    }

    // Include stage display with answers embedded, or just answers
    if (item.includeStageDisplay) {
      textItems.push(
        await getStageDisplayForPrompt(
          experimentId,
          cohortId,
          participantId,
          stage,
          item.includeParticipantAnswers,
        ),
      );
    } else if (item.includeParticipantAnswers) {
      textItems.push(
        await getStageAnswersForPrompt(
          experimentId,
          cohortId,
          participantId,
          stage,
        ),
      );
    }

    return textItems.join('\n');
  };

  // For each stage in list, add context
  const items: string[] = [];
  for (const id of stageList) {
    items.push(await getContextForStage(id));
  }
  return items.join('\n');
}

export async function getStageDisplayForPrompt(
  experimentId: string,
  cohortId: string,
  participantId: string | null, // if null, include all participants
  stage: StageConfig,
  includeAnswers: boolean,
) {
  switch (stage.kind) {
    case StageKind.TOS:
      // TODO: Add timestamp for TOS for given participant
      return stage.tosLines.join('\n');
    case StageKind.INFO:
      return stage.infoLines.join('\n');
    case StageKind.CHAT:
      const messages = await getFirestorePublicStageChatMessages(
        experimentId,
        cohortId,
        stage.id,
      );
      return getChatPromptMessageHistory(messages, stage);
    default:
      // TODO: Set up display/answers for ranking stage
      // TODO: Set up display/answers for survey stage
      return '';
  }
}

export async function getStageAnswersForPrompt(
  experimentId: string,
  cohortId: string,
  participantId: string | null, // if null, include all participants
  stage: StageConfig,
) {
  // TODO: Return participant answer(s)
  return '';
}
