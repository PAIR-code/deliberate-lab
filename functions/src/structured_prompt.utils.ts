import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  PROMPT_ITEM_PROFILE_CONTEXT_PARTICIPANT_SCAFFOLDING,
  PROMPT_ITEM_PROFILE_INFO_PARTICIPANT_SCAFFOLDING,
  BasePromptConfig,
  Condition,
  CohortConfig,
  Experiment,
  MediatorProfileExtended,
  ParticipantProfileExtended,
  PromptItem,
  PromptItemGroup,
  PromptItemType,
  StageConfig,
  StageContextData,
  StageContextPromptItem,
  StageKind,
  UserType,
  extractConditionDependencies,
  evaluateConditionWithStageAnswers,
  getAllPrecedingStageIds,
  getNameFromPublicId,
  getVariableContext,
  initializeStageContextData,
  makeStructuredOutputPrompt,
  resolveTemplateVariables,
  shuffleWithSeed,
  StageParticipantAnswer,
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
      return mediatorPrompt ?? undefined;
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
  const experiment = (await getFirestoreExperiment(experimentId))!;

  // Fetch cohort config, which may be needed to populate variables
  const cohort = (await getFirestoreCohort(experimentId, cohortId))!;

  // Fetch all active participants in cohort
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
  );

  // Fetch participants whose answers should be included in prompt
  let answerParticipants: ParticipantProfileExtended[] = [];

  if (contextParticipantIds?.length) {
    // If specific participant IDs provided, use those
    // (e.g., for private chats where mediator needs context about one participant)
    answerParticipants = (await Promise.all(
      contextParticipantIds.map((id) =>
        getFirestoreParticipant(experimentId, id),
      ),
    )) as ParticipantProfileExtended[];
  } else if (userProfile.type === UserType.PARTICIPANT) {
    // Participant only needs their own context
    answerParticipants = [
      (await getFirestoreParticipant(experimentId, userProfile.privateId))!,
    ];
  } else if (userProfile.type === UserType.MEDIATOR) {
    // Mediator in group context needs all participants
    answerParticipants = activeParticipants;
  }

  for (const item of promptConfig.prompt) {
    await addFirestoreDataForPromptItem(
      experiment,
      cohortId,
      currentStageId,
      promptConfig.type,
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
  stageKind: StageKind,
  promptItem: PromptItem,
  // All active participants in cohort
  activeParticipants: ParticipantProfileExtended[],
  // Participants to include in any potential answers
  answerParticipants: ParticipantProfileExtended[],
  data: Record<string, StageContextData> = {},
) {
  // Check condition if present
  // Conditions are only supported for private chat contexts
  if (promptItem.condition && stageKind === StageKind.PRIVATE_CHAT) {
    // Lazily fetch any missing stage data needed for condition evaluation
    await fetchConditionDependencies(
      experiment.id,
      cohortId,
      promptItem.condition,
      answerParticipants,
      data,
    );

    // Evaluate condition - skip fetching remaining data if condition not met
    if (
      !shouldIncludePromptItem(promptItem, stageKind, answerParticipants, data)
    ) {
      return;
    }
  }

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
            stageKind,
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
          stageKind,
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

/** Assemble prompt items into final prompt string for an agent.
 * This is the main function called to get a final prompt string that
 * can be sent to an LLM API without any further edits.
 *
 * @param userProfile - The agent (participant or mediator) for whom the prompt is being generated.
 *   This determines whose variables are used for template resolution.
 * @param contextParticipantIds - Optional participant IDs to scope StageContext (e.g., survey answers
 *   for private chats where a mediator needs context about specific participants).
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
    promptConfig.type, // Pass stageKind to distinguish privateChat from groupChat.
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

/**
 * Returns string representing ProfileInfo prompt item.
 *
 * @param userProfile - The agent's profile.
 * @param includeScaffolding - Whether to include scaffolding text.
 * @param stageId - The current stage ID. Used for a temporary hack where we
 *   check if the stageId string contains special profile set identifiers
 *   (SECONDARY_PROFILE_SET_ID, TERTIARY_PROFILE_SET_ID) to override which
 *   profile name/avatar to display. A better approach would be to add a
 *   profileSetId field to BaseStageConfig instead of encoding this in the
 *   stage ID string.
 */
function getProfileInfoForPrompt(
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
  includeScaffolding: boolean,
  stageId: string, // Used for temporary stage ID hack that sets profiles
): string {
  // This is a temporary check to see if the profile names should be
  // overrided for this stage only, e.g., if the profile is typically
  // of the "Animals 1" set but in this stage only uses "Animals 2" name/avatar
  // NOTE: It actually may be useful to define all profile identities here
  // as prior stages' context will not make sense if it references "Animals 1"
  // profile and the current stage uses "Animals 2".
  const getProfileSetId = () => {
    if (stageId.includes(SECONDARY_PROFILE_SET_ID)) {
      return PROFILE_SET_ANIMALS_2_ID;
    } else if (stageId.includes(TERTIARY_PROFILE_SET_ID)) {
      return PROFILE_SET_NATURE_ID;
    }
    return '';
  };

  const scaffoldingPrefix = includeScaffolding ? `Alias: ` : '';
  // TODO: Instead of using general participant scaffolding in the suffix,
  // use either "assigned profile" scaffolding or "seleted profile" scaffolding
  // based on which profile type is being set during the profile stage
  // (or which hardcoded profile type—see comment above—is being used
  // for this stage only). This will require passing in the profile type
  // from the experiment's profile stage (consider storing in promptData?).
  // NOTE: Consider slightly different scaffolding to handle hardcoded cases.
  const scaffoldingSuffix =
    includeScaffolding && userProfile.type === UserType.PARTICIPANT
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

/**
 * Lazily fetch stage data needed for condition evaluation.
 * Only fetches data for stages not already present in the data object.
 */
async function fetchConditionDependencies(
  experimentId: string,
  cohortId: string,
  condition: Condition,
  answerParticipants: ParticipantProfileExtended[],
  data: Record<string, StageContextData>,
): Promise<void> {
  const dependencies = extractConditionDependencies(condition);
  const requiredStageIds = [...new Set(dependencies.map((dep) => dep.stageId))];

  // Find stages not already in data
  const missingStageIds = requiredStageIds.filter((stageId) => !data[stageId]);

  // Fetch missing stage answers
  if (missingStageIds.length > 0) {
    await Promise.all(
      missingStageIds.map(async (stageId) => {
        const stage = await getFirestoreStage(experimentId, stageId);
        if (!stage) return;
        data[stageId] = initializeStageContextData(stage);
        data[stageId].privateAnswers = await getFirestoreAnswersForStage(
          experimentId,
          cohortId,
          stageId,
          answerParticipants,
        );
      }),
    );
  }
}

/**
 * Build stage answers map from StageContextData for a specific participant.
 * Used for condition evaluation after all data has been fetched.
 */
function buildStageAnswersForParticipant(
  stageContextData: Record<string, StageContextData>,
  participantPublicId: string,
): Record<string, StageParticipantAnswer> {
  const stageAnswers: Record<string, StageParticipantAnswer> = {};

  for (const [stageId, stageData] of Object.entries(stageContextData)) {
    const participantAnswer = stageData.privateAnswers.find(
      (entry) => entry.participantPublicId === participantPublicId,
    );
    if (participantAnswer) {
      stageAnswers[stageId] = participantAnswer.answer;
    }
  }

  return stageAnswers;
}

/**
 * Evaluate a prompt item's condition for a single participant.
 * Returns true if the condition is met (or if there's no condition).
 * Only works for private chat contexts with a single participant.
 */
function shouldIncludePromptItem(
  promptItem: PromptItem,
  stageKind: StageKind,
  participants: ParticipantProfileExtended[],
  stageContextData: Record<string, StageContextData>,
): boolean {
  if (
    !promptItem.condition ||
    stageKind !== StageKind.PRIVATE_CHAT ||
    participants.length !== 1
  ) {
    return true;
  }
  const stageAnswers = buildStageAnswersForParticipant(
    stageContextData,
    participants[0].publicId,
  );
  return evaluateConditionWithStageAnswers(promptItem.condition, stageAnswers);
}

/**
 * Process prompt items recursively and return the assembled prompt text.
 *
 * @param promptItems - The list of prompt items to process.
 * @param cohortId - The cohort ID (used as shuffle seed for GROUP items with cohort-based shuffling).
 * @param stageId - The current stage ID. Used for:
 *   - Determining preceding stages when STAGE_CONTEXT has empty stageId
 *   - Labeling current vs previous stages in scaffolding
 *   - Profile set override hack (see getProfileInfoForPrompt)
 * @param stageKind - The kind of the current stage (e.g., PRIVATE_CHAT, CHAT).
 *   Used to determine whether participant-level variables should be resolved.
 *   We pass this explicitly rather than deriving from stageId because the stage
 *   config may not be in promptData.data (it's only fetched when needed by
 *   STAGE_CONTEXT prompt items).
 * @param promptData - Pre-fetched data from Firestore:
 *   - experiment: The experiment config (also used for experiment-based shuffle seeding)
 *   - cohort: The cohort config (for cohort-level variables)
 *   - participants: Participants whose answers are used for STAGE_CONTEXT rendering,
 *     condition evaluation, and participant-based shuffle seeding
 *   - data: Stage context data keyed by stage ID
 * @param userProfile - The agent's profile (participant or mediator). Used for:
 *   - Determining variable resolution strategy (agent participants use their own variables)
 *   - PROFILE_CONTEXT and PROFILE_INFO prompt item rendering (tells the agent its own identity)
 *   - Determining scaffolding behavior (stage labeling for agent participants)
 *   - Fallback for participant-based shuffle seeding
 * @param includeScaffolding - Whether to include scaffolding text in the prompt.
 */
async function processPromptItems(
  promptItems: PromptItem[],
  cohortId: string,
  stageId: string,
  stageKind: StageKind,
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

  // Determine which participant's variables to use for template resolution.
  // For agent participants, use their own variables.
  // For mediators in private chat, use that participant's variables.
  let participantForVariables: ParticipantProfileExtended | undefined;
  if (userProfile.type === UserType.PARTICIPANT) {
    participantForVariables = userProfile as ParticipantProfileExtended;
  } else if (
    userProfile.type === UserType.MEDIATOR &&
    stageKind === StageKind.PRIVATE_CHAT
  ) {
    participantForVariables =
      promptData.participants.length === 1
        ? promptData.participants[0]
        : undefined;
  }

  // Get variable context for resolving templates
  const {variableDefinitions, valueMap} = getVariableContext(
    experiment,
    promptData.cohort,
    participantForVariables,
  );

  for (const promptItem of promptItems) {
    // Check condition if present (only for private chat contexts)
    if (
      !shouldIncludePromptItem(
        promptItem,
        stageKind,
        promptData.participants,
        promptData.data,
      )
    ) {
      continue;
    }

    switch (promptItem.type) {
      case PromptItemType.TEXT:
        // Resolve template variables in text prompt items
        const resolvedText = resolveTemplateVariables(
          promptItem.text,
          variableDefinitions,
          valueMap,
        );
        items.push(resolvedText);
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
          // Resolve template variables in stage config before formatting
          const rawStageContext = promptData.data[id];
          const resolvedStage = stageManager.resolveTemplateVariablesInStage(
            rawStageContext.stage,
            variableDefinitions,
            valueMap,
          );
          const resolvedStageContext = {
            ...rawStageContext,
            stage: resolvedStage,
          };

          items.push(
            getStageContextForPrompt(
              promptData.participants,
              resolvedStageContext,
              promptItem,
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
              // Use participant's public ID for consistent per-participant shuffling.
              // For mediators in private chat, use the participant they're chatting with.
              seedString =
                participantForVariables?.publicId ?? userProfile.publicId;
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
          stageKind,
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
 *
 * @param stageContext - Stage context with template variables already resolved.
 */
function getStageContextForPrompt(
  participants: ParticipantProfileExtended[],
  stageContext: StageContextData,
  item: StageContextPromptItem,
  includeScaffolding: boolean,
): string {
  const stage = stageContext.stage;
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
