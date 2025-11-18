import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  PROMPT_ITEM_PROFILE_CONTEXT_PARTICIPANT_SCAFFOLDING,
  PROMPT_ITEM_PROFILE_INFO_PARTICIPANT_SCAFFOLDING,
  AssetAllocationStageParticipantAnswer,
  BasePromptConfig,
  ChatStageConfig,
  CohortConfig,
  Experiment,
  MediatorProfileExtended,
  ParticipantProfileExtended,
  PrivateChatStageConfig,
  ProfileAgentConfig,
  PromptItem,
  PromptItemGroup,
  PromptItemType,
  RoleStagePublicData,
  StageConfig,
  StageContextData,
  StageContextPromptItem,
  StageKind,
  StageParticipantAnswer,
  SurveyStageConfig,
  SurveyPerParticipantStageConfig,
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  UserProfile,
  UserType,
  extractVariablesFromVariableConfigs,
  getAllPrecedingStageIds,
  getNameFromPublicId,
  initializeStageContextData,
  makeStructuredOutputPrompt,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
import {
  getAgentMediatorPrompt,
  getAgentParticipantPrompt,
  getFirestoreActiveParticipants,
  getFirestoreAnswersForStage,
  getFirestoreCohort,
  getFirestoreExperiment,
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
} from './utils/firestore';
import {stageManager} from './app';

/** Attempts to fetch corresponding prompt config from storage,
 * else returns the stage's default config.
 */
export async function getStructuredPromptConfig(
  experimentId: string,
  stage: StageConfig,
  user: ParticipantProfileExtended | MediatorProfileExtended,
): Promise<BasePromptConfig | undefined> {
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
      // Return stored prompt or fallback default prompt
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
      // If prompt not stored under experiment, then return undefined
      return mediatorPrompt;
    default:
      return undefined;
  }
}

/** Populates data object with Firestore documents needed for given
 * structured prompt
 */
export async function getFirestoreDataForStructuredPrompt(
  experimentId: string,
  cohortId: string,
  currentStageId: string,
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  promptConfig: BasePromptConfig,
  contextParticipantIds?: string[], // Optional: specific participant IDs for context (e.g., for private chats)
): Promise<{
  experiment: Experiment;
  cohort: CohortConfig;
  // participants whose answers should be used in prompt
  participants: ParticipantProfileExtended[];
  data: Record<string, StageContextData>;
}> {
  const data: Record<string, StageContextData> = {};

  // Fetch experiment config, which is used to grab preceding stages
  const experiment = await getFirestoreExperiment(experimentId);

  // Fetch cohort config, which may be needed to populate variables
  const cohort = await getFirestoreCohort(experimentId, cohortId);

  // Fetch all active participants in cohort
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
  );

  // Fetch participants whose answers should be included in prompt
  let answerParticipants: ParticipantProfileExtended[] = [];

  if (contextParticipantIds && contextParticipantIds.length > 0) {
    // If specific participant IDs provided, use those
    // (e.g., for private chats where mediator needs context about one participant)
    answerParticipants = await Promise.all(
      contextParticipantIds.map((id) =>
        getFirestoreParticipant(experimentId, id),
      ),
    );
  } else if (userProfile.type === UserType.PARTICIPANT) {
    // Participant only needs their own context
    answerParticipants.push(
      await getFirestoreParticipant(experimentId, userProfile.privateId),
    );
  } else if (userProfile.type === UserType.MEDIATOR) {
    // Mediator in group context needs all participants
    answerParticipants = activeParticipants;
  }

  for (const item of promptConfig.prompt) {
    await addFirestoreDataForPromptItem(
      experiment,
      cohortId,
      currentStageId,
      item,
      activeParticipants,
      answerParticipants,
      data,
    );
  }
  return {experiment, cohort, participants: answerParticipants, data};
}

/** Populates data object with Firestore documents needed for given single
 * prompt item.
 */
export async function addFirestoreDataForPromptItem(
  experiment: Experiment,
  cohortId: string,
  currentStageId: string,
  promptItem: PromptItem,
  // All active participants in cohort
  activeParticipants: ParticipantProfileExtended[],
  // Participants to include in any potential answers
  answerParticipants: ParticipantProfileExtended[],
  data: Record<string, StageContextData> = {},
) {
  // Get profile set ID based on stage ID
  // (Temporary workaround before profile sets are refactored)
  const getProfileSetId = (stageId: string) => {
    if (stageId.includes(SECONDARY_PROFILE_SET_ID)) {
      return PROFILE_SET_ANIMALS_2_ID;
    } else if (stageId.includes(TERTIARY_PROFILE_SET_ID)) {
      return PROFILE_SET_NATURE_ID;
    }
    return '';
  };

  switch (promptItem.type) {
    case PromptItemType.STAGE_CONTEXT:
      // If stage ID is empty, call this function for all stage IDs
      // leading up to this stage ID
      if (!promptItem.stageId) {
        for (const stageId of getAllPrecedingStageIds(
          experiment.stageIds,
          currentStageId,
        )) {
          await addFirestoreDataForPromptItem(
            experiment,
            cohortId,
            currentStageId,
            {...promptItem, stageId},
            activeParticipants,
            answerParticipants,
            data,
          );
        }
        return;
      }

      // Fetch stage config if not already fetched
      if (promptItem.stageId !== '' && !data[promptItem.stageId]) {
        const stage = await getFirestoreStage(
          experiment.id,
          promptItem.stageId,
        );
        if (!stage) break;

        // Store stage config in stage context object
        data[promptItem.stageId] = initializeStageContextData(stage);

        // Store all active participants
        data[promptItem.stageId].participants = activeParticipants;

        // If group chat, fetch group chat messages
        if (stage.kind === StageKind.CHAT) {
          data[promptItem.stageId].publicChatMessages =
            await getFirestorePublicStageChatMessages(
              experiment.id,
              cohortId,
              promptItem.stageId,
            );
        }

        // If private chat, fetch private chat messages for each participant
        if (stage.kind === StageKind.PRIVATE_CHAT) {
          for (const participant of answerParticipants) {
            data[promptItem.stageId].privateChatMap[participant.publicId] =
              await getFirestorePrivateChatMessages(
                experiment.id,
                participant.privateId,
                promptItem.stageId,
              );
          }
        }
      }
      // If answers needed and not populated, fetch private/public data
      const stageData = data[promptItem.stageId];
      if (
        promptItem.includeParticipantAnswers &&
        stageData.privateAnswers.length === 0
      ) {
        // Fill private answers for each participant
        stageData.privateAnswers = await getFirestoreAnswersForStage(
          experiment.id,
          cohortId,
          promptItem.stageId,
          answerParticipants,
          getProfileSetId(promptItem.stageId),
        );
        // Fill public data for cohort
        stageData.publicData = await getFirestoreStagePublicData(
          experiment.id,
          cohortId,
          promptItem.stageId,
        );
      }
      break;
    case PromptItemType.GROUP:
      for (const item of promptItem.items) {
        await addFirestoreDataForPromptItem(
          experiment,
          cohortId,
          currentStageId,
          item,
          activeParticipants,
          answerParticipants,
          data,
        );
      }
      break;
    default:
      return;
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
  stageId: string, // current stage ID
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  promptConfig: BasePromptConfig,
  contextParticipantIds?: string[], // Optional: specific participant IDs for context (e.g., for private chats)
): Promise<string> {
  // Get Firestore data used to construct prompt
  const promptData = await getFirestoreDataForStructuredPrompt(
    experimentId,
    cohortId,
    stageId,
    userProfile,
    promptConfig,
    contextParticipantIds,
  );

  const promptText = await processPromptItems(
    promptConfig.prompt,
    cohortId,
    stageId,
    promptData,
    userProfile,
    promptConfig.includeScaffoldingInPrompt,
  );

  // Add structured output if relevant
  const structuredOutput = makeStructuredOutputPrompt(
    promptConfig.structuredOutputConfig,
  );

  return structuredOutput ? `${promptText}\n${structuredOutput}` : promptText;
}

/** Returns string representing ProfileContext prompt item. */
function getProfileContextForPrompt(
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  includeScaffolding: boolean,
): string {
  const profileContext = userProfile.agentConfig?.promptContext;
  if (profileContext) {
    if (userProfile.type === UserType.PARTICIPANT && includeScaffolding) {
      const instructions = PROMPT_ITEM_PROFILE_CONTEXT_PARTICIPANT_SCAFFOLDING;
      return `Private persona context: ${profileContext}\n${instructions}`;
    } else {
      return profileContext;
    }
  }
  return '';
}

/** Returns string representing ProfileInfo prompt item. */
function getProfileInfoForPrompt(
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  includeScaffolding: boolean,
  stageId: string, // Used for temporary stage ID hack that sets profiles
): string {
  const getProfileSetId = () => {
    if (stageId.includes(SECONDARY_PROFILE_SET_ID)) {
      return PROFILE_SET_ANIMALS_2_ID;
    } else if (stageId.includes(TERTIARY_PROFILE_SET_ID)) {
      return PROFILE_SET_NATURE_ID;
    }
    return '';
  };

  const scaffoldingPrefix = includeScaffolding ? `Alias: ` : '';
  const scaffoldingSuffix = includeScaffolding
    ? `\n${PROMPT_ITEM_PROFILE_INFO_PARTICIPANT_SCAFFOLDING}`
    : '';

  if (userProfile.type === UserType.PARTICIPANT) {
    return userProfile.name
      ? `${scaffoldingPrefix}${getNameFromPublicId([userProfile], userProfile.publicId, getProfileSetId())}${scaffoldingSuffix}`
      : 'Profile not yet set';
  } else {
    // TODO: Adjust display for mediator profiles
    return `${scaffoldingPrefix}${userProfile.avatar} ${userProfile.name}${scaffoldingSuffix}`;
  }
}

/** Process prompt items recursively. */
async function processPromptItems(
  promptItems: PromptItem[],
  cohortId: string,
  stageId: string,
  promptData: {
    experiment: Experiment;
    cohort: CohortConfig;
    participants: ParticipantProfileExtended[];
    data: Record<string, StageContextData>;
  },
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  includeScaffolding: boolean,
): Promise<string> {
  const experiment = promptData.experiment;
  const items: string[] = [];

  for (const promptItem of promptItems) {
    switch (promptItem.type) {
      case PromptItemType.TEXT:
        items.push(promptItem.text);
        break;
      case PromptItemType.PROFILE_CONTEXT:
        const profileContext = getProfileContextForPrompt(
          userProfile,
          includeScaffolding,
        );
        if (profileContext) {
          items.push(profileContext);
        }
        break;
      case PromptItemType.PROFILE_INFO:
        items.push(
          getProfileInfoForPrompt(userProfile, includeScaffolding, stageId),
        );
        break;
      case PromptItemType.STAGE_CONTEXT:
        const stageContextIds = promptItem.stageId
          ? [promptItem.stageId]
          : getAllPrecedingStageIds(experiment.stageIds, stageId);
        // For agent participants with scaffolding, annotate previous vs.
        // current stages
        const labelStages =
          includeScaffolding && userProfile.type === UserType.PARTICIPANT;
        if (labelStages) {
          items.push(
            `\n--- Previously completed stages chronologically (read only) ---`,
          );
        }
        for (const id of stageContextIds) {
          if (id === stageId && labelStages) {
            items.push(`\n--- Current stage ---`);
          }
          items.push(
            await getStageContextForPrompt(
              promptData.participants,
              promptData.data[id],
              id,
              promptItem,
              promptData.experiment,
              promptData.cohort,
              userProfile,
              includeScaffolding,
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
              seedString = experiment.id;
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
          cohortId,
          stageId,
          promptData,
          userProfile,
          includeScaffolding,
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
  participants: ParticipantProfileExtended[],
  rawStageContext: StageContextData,
  currentStageId: string,
  item: StageContextPromptItem,
  // The following params are needed for variable extraction
  experiment: Experiment,
  cohort: CohortConfig,
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  includeScaffolding: boolean,
) {
  // Resolve template variables in the stage context before
  // using it to assemble context for prompt.
  // WARNING: This is a temporary hack and may not work as expected.
  // TODO: Move this to an appropriate location/helper function.
  const experimentVariableMap = experiment.variableMap ?? {};
  const cohortVariableMap = cohort.variableMap ?? {};

  // WARNING: This only uses the current participant's variables.
  // If variables vary at the participant level, the other participants'
  // variables are not yet shown, i.e., agent mediator prompts with
  // participant-level variables will not work.
  const participantVariableMap =
    userProfile?.type === UserType.PARTICIPANT ? userProfile.variableMap : {};
  const variableMap = extractVariablesFromVariableConfigs(
    experiment.variableConfigs ?? [],
  );
  const valueMap = {
    ...experimentVariableMap,
    ...cohortVariableMap,
    ...participantVariableMap,
  };
  const stage = stageManager.resolveTemplateVariablesInStage(
    rawStageContext.stage,
    variableMap,
    valueMap,
  );
  const stageContext = {...rawStageContext, stage};

  const textItems: string[] = [];

  // Include name of stage if scaffolding
  if (includeScaffolding) {
    textItems.push(`[Stage: ${stage.name ?? stage.id}]`);
  }

  if (item.includePrimaryText && stage.descriptions.primaryText.trim() !== '') {
    textItems.push(`* Stage description: ${stage.descriptions.primaryText}`);
  }
  if (item.includeInfoText) {
    textItems.push(`* Additional info: ${stage.descriptions.infoText}`);
  }
  // Note: Help text not included since the field has been deprecated

  // Always include stage display (with answers if specified by prompt item)
  const stageDisplay = stageManager.getStageDisplayForPrompt(
    stage,
    item.includeParticipantAnswers ? participants : [],
    stageContext,
    includeScaffolding,
  );
  textItems.push(stageDisplay);

  return textItems.join('\n');
}
