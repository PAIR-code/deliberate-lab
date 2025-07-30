import {
  AssetAllocationStageParticipantAnswer,
  BasePromptConfig,
  ProfileAgentConfig,
  PromptItemType,
  StageConfig,
  StageContextPromptItem,
  StageKind,
  UserProfile,
  getChatPromptMessageHistory,
  getStockInfoSummaryText,
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';
import {
  getAssetAllocationAnswersText,
  getAssetAllocationSummaryText,
} from './stages/asset_allocation.utils';
import {
  getFirestoreAnswersForStage,
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
} from './utils/firestore';

// ****************************************************************************
// Helper functions related to assembling structured prompts.
// ****************************************************************************

/** Assemble prompt items into final prompt. */
export async function getStructuredPrompt(
  experimentId: string,
  cohortId: string,
  // List of participant private IDs for participants to include for answers
  participantIds: string[],
  stageId: string, // current stage ID
  userProfile: UserProfile,
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
      case PromptItemType.PROFILE_INFO:
        const profileInfo: string[] = [];
        if (userProfile.avatar) {
          profileInfo.push(userProfile.avatar);
        }
        if (userProfile.name) {
          profileInfo.push(userProfile.name);
        }
        if (userProfile.pronouns) {
          profileInfo.push(`(${userProfile.pronouns})`);
        }
        items.push(profileInfo.join(' '));
        break;
      case PromptItemType.STAGE_CONTEXT:
        items.push(
          await getStageContextForPrompt(
            experimentId,
            cohortId,
            participantIds,
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
  participantIds: string[],
  currentStageId: string,
  item: StageContextPromptItem,
) {
  // Get the specific stage
  const stage = await getFirestoreStage(experimentId, item.stageId);
  if (!stage) {
    return '';
  }

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
        participantIds,
        stage,
        item.includeParticipantAnswers,
      ),
    );
  } else if (item.includeParticipantAnswers) {
    textItems.push(
      await getStageAnswersForPrompt(
        experimentId,
        cohortId,
        participantIds,
        stage,
      ),
    );
  }

  return textItems.join('\n');
}

export async function getStageDisplayForPrompt(
  experimentId: string,
  cohortId: string,
  participantIds: string[], // participant private IDs for answer inclusion
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
    case StageKind.PRIVATE_CHAT:
      // Private chat should have exactly 1 participant
      if (participantIds.length === 0) return '';
      const participantIdForPrivate = participantIds[0];
      const privateMessages = await getFirestorePrivateChatMessages(
        experimentId,
        participantIdForPrivate,
        stage.id,
      );
      return getChatPromptMessageHistory(privateMessages, stage);
    case StageKind.ROLE:
      const rolePublicData = await getFirestoreStagePublicData(
        experimentId,
        cohortId,
        stage.id,
      );
      const getRoleDisplay = (roleId: string) => {
        if (stage.kind !== StageKind.ROLE) return '';
        return (
          stage.roles.find((role) => role.id === roleId)?.displayLines ?? []
        );
      };
      const roleInfo: string[] = [];
      for (const participantId of participantIds) {
        const participant = await getFirestoreParticipant(
          experimentId,
          participantId,
        );
        roleInfo.push(
          `${participant.publicId}: ${getRoleDisplay(rolePublicData.participantMap[participant.publicId] ?? '').join('\n\n')}`,
        );
      }
      return roleInfo.join('\n');
    case StageKind.STOCKINFO:
      return getStockInfoSummaryText(stage);
    case StageKind.ASSET_ALLOCATION:
      const assetAllocationDisplay = getAssetAllocationSummaryText(stage);

      if (includeAnswers) {
        const assetAllocationAnswers = await getStageAnswersForPrompt(
          experimentId,
          cohortId,
          participantIds,
          stage,
        );
        return assetAllocationAnswers
          ? `${assetAllocationDisplay}\n\n${assetAllocationAnswers}`
          : assetAllocationDisplay;
      }
      return assetAllocationDisplay;
    default:
      // TODO: Set up display/answers for ranking stage
      // TODO: Set up display/answers for survey stage
      return '';
  }
}

export async function getStageAnswersForPrompt(
  experimentId: string,
  cohortId: string,
  participantIds: string[], // participant private IDs
  stage: StageConfig,
) {
  // TODO: Return participant answer(s)
  switch (stage.kind) {
    case StageKind.ASSET_ALLOCATION:
      const participantAnswers =
        await getFirestoreAnswersForStage<AssetAllocationStageParticipantAnswer>(
          experimentId,
          cohortId,
          stage.id,
          participantIds,
        );
      return getAssetAllocationAnswersText(participantAnswers);
    default:
      return '';
  }
}
