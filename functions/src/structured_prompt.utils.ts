import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  AssetAllocationStageParticipantAnswer,
  BasePromptConfig,
  ChatStageConfig,
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
  getAllPrecedingStageIds,
  getNameFromPublicId,
  getSurveySummaryText,
  getSurveyAnswersText,
  initializeStageContextData,
  makeStructuredOutputPrompt,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
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
): Promise<{
  experiment: Experiment;
  participants: ParticipantProfileExtended[];
  data: Record<string, StageContextData>;
}> {
  const data: Record<string, StageContextData> = {};

  // Fetch experiment config, which is used to grab preceding stages
  const experiment = await getFirestoreExperiment(experimentId);

  // Fetch participants used for prompt
  // (if participant, this is just the current participant;
  // if mediator, it's all active cohort participants)
  let participants: ParticipantProfileExtended[] = [];
  if (userProfile.type === UserType.PARTICIPANT) {
    participants.push(
      await getFirestoreParticipant(experimentId, userProfile.privateId),
    );
  } else if (userProfile.type === UserType.MEDIATOR) {
    participants = await getFirestoreActiveParticipants(experimentId, cohortId);
  }

  for (const item of promptConfig.prompt) {
    await addFirestoreDataForPromptItem(
      experiment,
      cohortId,
      currentStageId,
      item,
      participants,
      data,
    );
  }

  return {experiment, participants, data};
}

/** Populates data object with Firestore documents needed for given single
 * prompt item.
 */
export async function addFirestoreDataForPromptItem(
  experiment: Experiment,
  cohortId: string,
  currentStageId: string,
  promptItem: PromptItem,
  // Participants to include in any potential answers
  participants: ParticipantProfileExtended[],
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
            participants,
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
          for (const participant of participants) {
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
          participants,
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
          participants,
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
): Promise<string> {
  // Get Firestore data used to construct prompt
  const promptData = await getFirestoreDataForStructuredPrompt(
    experimentId,
    cohortId,
    stageId,
    userProfile,
    promptConfig,
  );

  const promptText = await processPromptItems(
    promptConfig.prompt,
    cohortId,
    stageId,
    promptData,
    userProfile,
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
  cohortId: string,
  stageId: string,
  promptData: {
    experiment: Experiment;
    participants: ParticipantProfileExtended[];
    data: Record<string, StageContextData>;
  },
  userProfile: ParticipantProfileExtended | MediatorProfileExtended,
): Promise<string> {
  const experiment = promptData.experiment;
  const items: string[] = [];

  for (const promptItem of promptItems) {
    switch (promptItem.type) {
      case PromptItemType.TEXT:
        items.push(promptItem.text);
        break;
      case PromptItemType.PROFILE_CONTEXT:
        if (userProfile.agentConfig?.promptContext) {
          items.push(
            `Private persona context: ${userProfile.agentConfig.promptContext}\nThis information is private to you. Use it to guide your behavior in this task. Other participants do not know these attributes unless you choose to share it.`,
          );
        }
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
          const profileSetId = getProfileSetId();
          const participantInstructions: string = `You are a human participant interacting in an online task with multiple stages. In this query, you will provide an action for the current stage - for example, participating in a live chat, answering survey questions, or acknowledging information. Respond as this participant in order to move the task forward.\n`;

          let scaffolding: string = `This is your randomly assigned pseudonymous alias. Others will use it to refer to you. It’s only a label (such as an animal or object). You are still a human using this alias.`;
          // TODO: Fix this.
          if (profileSetId) {
            scaffolding = `This is the display name you chose for others to see you as.`;
          }

          items.push(
            `${participantInstructions}\n--- Participant description ---\nAlias: ${getNameFromPublicId(
              [userProfile],
              userProfile.publicId,
              profileSetId,
            )}\n${scaffolding}
          `,
          );
        } else {
          // TODO: Adjust display for mediator profiles
          items.push(
            `You are participating in a live conversation as the following online alias.\n\nAlias: ${userProfile.avatar} ${userProfile.name}.\n\nFollow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.`,
          );
        }
        break;
      case PromptItemType.STAGE_CONTEXT:
        const stageContextIds = promptItem.stageId
          ? [promptItem.stageId]
          : getAllPrecedingStageIds(experiment.stageIds, stageId);

        // Previous stages for non-mediators
        const ids = stageContextIds;
        if (userProfile.type === UserType.PARTICIPANT) {
          items.push('\n--- Previously completed stages (read only) ---');

          const prevIds = ids.slice(0, -1); // all except last

          for (let i = 0; i < prevIds.length; i++) {
            const id = prevIds[i];
            const stageNumber = i + 1; // 1-based
            items.push(
              await getStageContextForPrompt(
                promptData.participants,
                promptData.data[id],
                id,
                promptItem,
                stageNumber,
              ),
            );
          }
        }

        // Current stage
        const lastId = ids[ids.length - 1];
        const lastStage = promptData.data[lastId];
        items.push(
          `\n--- Current stage: ${lastStage.stage.name ?? lastStage.stage.id} ---`,
        );
        items.push(
          await getStageContextForPrompt(
            promptData.participants,
            lastStage,
            lastId,
            promptItem,
            ids.length, // Stage number
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
  stageContext: StageContextData,
  currentStageId: string,
  item: StageContextPromptItem,
  stageNumber: number,
) {
  // Get the specific stage
  const stage = stageContext.stage;

  const textItems: string[] = [];

  // Include name of stage
  textItems.push(`[Stage ${stageNumber}: ${stage.name ?? stage.id}]`);
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
  );
  textItems.push(stageDisplay);

  return textItems.join('\n');
}
