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
  getAgentMediatorPrompt,
  getAgentParticipantPrompt,
  getFirestoreActiveParticipants,
  getFirestoreAnswersForStage,
  getFirestoreExperiment,
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
} from './utils/firestore';
import {stageManager} from './app';

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

/** Return list of stage IDs preceding *and including* given stage ID. */
async function getAllPrecedingStageIds(experimentId: string, stageId: string) {
  const experiment = await getFirestoreExperiment(experimentId);
  return experiment.stageIds.slice(0, experiment.stageIds.indexOf(stageId) + 1);
}

/** Attempts to fetch corresponding prompt config from storage,
 * else returns the stage's default config.
 */
export async function getStructuredPromptConfig(
  experimentId: string,
  stage: StageConfig,
  user: ParticipantProfileExtended | MediatorProfileExtended,
): BasePromptConfig | undefined {
  if (!user.agentConfig) {
    return undefined;
  }
  switch (user.type) {
    case UserType.PARTICIPANT:
      const participantPrompt = await getAgentParticipantPrompt(
        experimentId,
        stage.id,
        user.agentConfig?.agentId,
      );
      return (
        participantPrompt ??
        stageManager.getDefaultParticipantStructuredPrompt(stage)
      );
    case UserType.MEDIATOR:
      const mediatorPrompt = await getAgentMediatorPrompt(
        experimentId,
        stage.id,
        user.agentConfig?.agentId,
      );
      return (
        mediatorPrompt ?? stageManager.getDefaultMediatorStructuredPrompt(stage)
      );
    default:
      return undefined;
  }
}

/** Assemble prompt items into final prompt string.
 * This is the main function called to get a final prompt string that
 * can be sent to an LLM API without any further edits.
 *
 * TODO: Instead of having the functions under this fetch documents
 * from Firestore, pass in a data structure containing all the database docs
 * needed (e.g., stage configs, cohort participants, private/public answers).
 *
 * This could save duplicate fetching and will also enable us to easily build
 * structured prompts with fake data (e.g., to preview prompts in experiment
 * builder).
 */
export async function getPromptFromConfig(
  experimentId: string,
  cohortId: string,
  // List of participant private IDs for participants to include for answers
  participantIds: string[],
  stageId: string, // current stage ID
  userProfile: UserProfile,
  agentConfig: ProfileAgentConfig,
  promptConfig: BasePromptConfig,
): Promise<string> {
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
        const stageContextIds = promptItem.stageId
          ? [stageId]
          : await getAllPrecedingStageIds(experimentId, stageId);
        for (const id of stageContextIds) {
          items.push(
            await getStageContextForPrompt(
              experimentId,
              cohortId,
              participantIds,
              stageId,
              id,
              promptItem,
            ),
          );
        }
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

/**
 * Assembles content from the given stage (e.g., information provided to
 * human participants for the stage) based on the prompt item settings of
 * what to include (e.g., stage description, participant's answers for the
 * stage) and formatted specifically for inserting into an LLM prompt.
 */
export async function getStageContextForPrompt(
  experimentId: string,
  cohortId: string,
  participantIds: string[],
  currentStageId: string,
  contextStageId: string, // use this and not item.stageId, which could be ''
  item: StageContextPromptItem,
) {
  // Get the specific stage
  const stage = await getFirestoreStage(experimentId, contextStageId);
  if (!stage) {
    return '';
  }

  const textItems: string[] = [];

  // Include name of stage
  textItems.push(`----- STAGE: ${stage.name ?? stage.id} -----`);

  if (item.includePrimaryText && stage.descriptions.primaryText.trim() !== '') {
    textItems.push(`- Stage description: ${stage.descriptions.primaryText}`);
  }
  if (item.includeInfoText) {
    textItems.push(`- Additional info: ${stage.descriptions.infoText}`);
  }
  // Note: Help text not included since the field has been deprecated

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

/** Formats the body content for the given stage, e.g., the terms of service
 * in a TOS stage or all the survey questions in a survey stage.
 *
 * NOTE: This shows all content visible to the participant, so a survey
 * stage will produce a complete list of all the survey questions
 * even if not all of them have been answered (just as a human participant
 * would see all the survey questions in the stage UI).
 */
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
    case StageKind.SURVEY: // Same logic as survey per participant below
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
