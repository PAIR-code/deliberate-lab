import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  AssetAllocationStageParticipantAnswer,
  BasePromptConfig,
  ChatStageConfig,
  PrivateChatStageConfig,
  ProfileAgentConfig,
  PromptItem,
  PromptItemGroup,
  PromptItemType,
  RoleStagePublicData,
  StageConfig,
  StageContextPromptItem,
  StageKind,
  StageParticipantAnswer,
  SurveyStageConfig,
  SurveyPerParticipantStageConfig,
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  UserProfile,
  UserType,
  getChatPromptMessageHistory,
  getNameFromPublicId,
  getStockInfoSummaryText,
  getSurveySummaryText,
  getSurveyAnswersText,
  makeStructuredOutputPrompt,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
import {
  getAssetAllocationAnswersText,
  getAssetAllocationSummaryText,
} from './stages/asset_allocation.utils';
import {
  getFirestoreActiveParticipants,
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

/** Helper to add display names (with avatars and pronouns) to participant answers */
async function addDisplayNamesToAnswers<T>(
  experimentId: string,
  participantAnswers: Array<{participantId: string; answer: T}>,
  stageId: string,
): Promise<Array<{participantId: string; answer: T}>> {
  // Fetch all participant profiles
  const participantProfiles = await Promise.all(
    participantAnswers.map(({participantId}) =>
      getFirestoreParticipant(experimentId, participantId),
    ),
  );

  // Determine profile set based on stage ID
  const profileSetId = stageId.includes(SECONDARY_PROFILE_SET_ID)
    ? PROFILE_SET_ANIMALS_2_ID
    : stageId.includes(TERTIARY_PROFILE_SET_ID)
      ? PROFILE_SET_NATURE_ID
      : '';

  return participantAnswers.map(({participantId, answer}, index) => {
    const participant = participantProfiles[index];
    if (!participant) {
      return {participantId, answer};
    }

    // Get display name with avatar and pronouns
    const displayName = getNameFromPublicId(
      [participant],
      participant.publicId,
      profileSetId,
      true, // includeAvatar
      true, // includePronouns
    );

    return {
      participantId: displayName,
      answer,
    };
  });
}

/** Convenience function to get stage answers with display names */
async function getStageAnswersWithDisplayNames<
  T extends StageParticipantAnswer,
>(
  experimentId: string,
  cohortId: string,
  stageId: string,
  participantIds?: string[],
): Promise<Array<{participantId: string; answer: T}>> {
  const answers = await getFirestoreAnswersForStage<T>(
    experimentId,
    cohortId,
    stageId,
    participantIds,
  );
  return addDisplayNamesToAnswers(experimentId, answers, stageId);
}

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
  const promptText = await processPromptItems(
    promptConfig.prompt,
    experimentId,
    cohortId,
    participantIds,
    stageId,
    userProfile,
    agentConfig,
  );

  // Add structured output if relevant
  const structuredOutput = makeStructuredOutputPrompt(
    promptConfig.structuredOutputConfig,
  );

  return structuredOutput ? `${promptText}\n${structuredOutput}` : promptText;
}

/** Process prompt items recursively. */
async function processPromptItems(
  promptItems: PromptItem[],
  experimentId: string,
  cohortId: string,
  participantIds: string[],
  stageId: string,
  userProfile: UserProfile,
  agentConfig: ProfileAgentConfig,
): Promise<string> {
  const items: string[] = [];
  for (const promptItem of promptItems) {
    switch (promptItem.type) {
      case PromptItemType.TEXT:
        items.push(promptItem.text);
        break;
      case PromptItemType.PROFILE_CONTEXT:
        items.push(agentConfig.promptContext);
        break;
      case PromptItemType.PROFILE_INFO:
        const getProfileSetId = () => {
          if (stageId.includes(SECONDARY_PROFILE_SET_ID)) {
            return PROFILE_SET_ANIMALS_2_ID;
          } else if (stageId.includes(TERTIARY_PROFILE_SET_ID)) {
            return PROFILE_SET_NATURE_ID;
          }
          return '';
        };
        if (userProfile.type === UserType.PARTICIPANT) {
          items.push(
            getNameFromPublicId(
              [userProfile],
              userProfile.publicId,
              getProfileSetId(),
            ),
          );
        } else {
          // TODO: Adjust display for mediator profiles
          items.push(`${userProfile.avatar} ${userProfile.name}`);
        }
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
      case PromptItemType.GROUP:
        const promptGroup = promptItem as PromptItemGroup;
        let groupItems = promptGroup.items;

        // Handle shuffling if configured
        if (promptGroup.shuffleConfig?.shuffle) {
          // Perform shuffle based on seed
          let seedString = '';
          switch (promptGroup.shuffleConfig.seed) {
            case 'experiment':
              seedString = experimentId;
              break;
            case 'cohort':
              seedString = cohortId;
              break;
            case 'participant':
              // Use participant's public ID for consistent per-participant shuffling
              seedString = userProfile.publicId;
              break;
            case 'custom':
              seedString = promptGroup.shuffleConfig.customSeed;
              break;
          }
          groupItems = shuffleWithSeed(groupItems, seedString);
        }

        const groupText = await processPromptItems(
          groupItems,
          experimentId,
          cohortId,
          participantIds,
          stageId,
          userProfile,
          agentConfig,
        );
        if (groupText) items.push(groupText);
        break;
      default:
        break;
    }
  }
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
      // List active participants in group chat
      const getProfileSetId = () => {
        if (stage.id.includes(SECONDARY_PROFILE_SET_ID)) {
          return PROFILE_SET_ANIMALS_2_ID;
        } else if (stage.id.includes(TERTIARY_PROFILE_SET_ID)) {
          return PROFILE_SET_NATURE_ID;
        }
        return '';
      };
      const participants = (
        await getFirestoreActiveParticipants(experimentId, cohortId, stage.id)
      )
        .map((participant) =>
          getNameFromPublicId(
            [participant],
            participant.publicId,
            getProfileSetId(),
            true,
            true,
          ),
        )
        .join(', ');
      return `Group chat participants: ${participants}\n${getChatPromptMessageHistory(messages, stage)}`;
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
        if (participant && rolePublicData) {
          roleInfo.push(
            `${participant.publicId}: ${getRoleDisplay(rolePublicData.participantMap[participant.publicId] ?? '').join('\n\n')}`,
          );
        } else {
          if (!participant) {
            console.error(
              `Could not create roleInfo for participant ${participantId} in stage ${stage.id}: Participant not found.`,
            );
          }
          if (!rolePublicData) {
            console.error(
              `Could not create roleInfo for participant ${participantId} in stage ${stage.id}: rolePublicData is missing.`,
            );
          }
        }
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
    case StageKind.SURVEY:
    case StageKind.SURVEY_PER_PARTICIPANT:
      const surveyDisplay = getSurveySummaryText(
        stage as SurveyStageConfig | SurveyPerParticipantStageConfig,
      );
      if (includeAnswers) {
        const surveyAnswers = await getStageAnswersForPrompt(
          experimentId,
          cohortId,
          participantIds,
          stage,
        );
        return surveyAnswers
          ? `${surveyDisplay}\n\n${surveyAnswers}`
          : surveyDisplay;
      }
      return surveyDisplay;
    default:
      // TODO: Set up display/answers for ranking stage
      return '';
  }
}

export async function getStageAnswersForPrompt(
  experimentId: string,
  cohortId: string,
  participantIds: string[], // participant private IDs
  stage: StageConfig,
) {
  switch (stage.kind) {
    case StageKind.ASSET_ALLOCATION:
      const assetParticipantAnswers =
        await getStageAnswersWithDisplayNames<AssetAllocationStageParticipantAnswer>(
          experimentId,
          cohortId,
          stage.id,
          participantIds,
        );
      return getAssetAllocationAnswersText(assetParticipantAnswers, true);
    case StageKind.SURVEY:
      const surveyParticipantAnswers =
        await getStageAnswersWithDisplayNames<SurveyStageParticipantAnswer>(
          experimentId,
          cohortId,
          stage.id,
          participantIds,
        );
      const surveyStage = stage as SurveyStageConfig;
      return getSurveyAnswersText(
        surveyParticipantAnswers,
        surveyStage.questions,
        true, // Always show participant names
      );
    case StageKind.SURVEY_PER_PARTICIPANT:
      const surveyPerParticipantAnswers =
        await getStageAnswersWithDisplayNames<SurveyPerParticipantStageParticipantAnswer>(
          experimentId,
          cohortId,
          stage.id,
          participantIds,
        );
      const surveyPerParticipantStage =
        stage as SurveyPerParticipantStageConfig;
      return getSurveyAnswersText(
        surveyPerParticipantAnswers,
        surveyPerParticipantStage.questions,
        true, // Always show participant names
      );
    default:
      return '';
  }
}
