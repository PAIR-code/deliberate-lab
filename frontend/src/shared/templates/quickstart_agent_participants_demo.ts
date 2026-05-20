import {
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  AgentPersonaType,
  ExperimentTemplate,
  MediatorPromptConfig,
  ParticipantPromptConfig,
  ProfileType,
  StageConfig,
  StageKind,
  RankingType,
  RevealAudience,
  StructuredOutputDataType,
  createAgentChatSettings,
  createAgentMediatorPersonaConfig,
  createChatPromptConfig,
  createChatStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createParticipantProfileBase,
  createProfileStage,
  createDefaultMediatorGroupChatPrompt,
  createStructuredOutputConfig,
  createSurveyStage,
  createTextSurveyQuestion,
  createScaleSurveyQuestion,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceItem,
  createSurveyPerParticipantStage,
  createRankingStage,
  createRevealStage,
  createRankingRevealItem,
  createStageTextConfig,
  createStageProgressConfig,
} from '@deliberation-lab/utils';

export function getAgentParticipantsDemoTemplate(): ExperimentTemplate {
  const CHAT_STAGE_ID = 'chat';
  const RANKING_STAGE_ID = 'ranking';

  const metadata = createMetadataConfig({
    name: 'Group Agent Participants Demo',
    publicName: 'Simulated Participants Demo',
    description:
      'This experiment showcases the social dynamics of agent participants in a group experiment. Add agent participants to a cohort to explore.',
  });

  const stageConfigs: StageConfig[] = [];

  // 1. Set your profile
  stageConfigs.push(
    createProfileStage({
      name: 'Set Your Profile',
      profileType: ProfileType.DEFAULT,
    }),
  );

  // 2. About Your Persona (Survey stage)
  stageConfigs.push(
    createSurveyStage({
      name: 'About Your Persona',
      descriptions: createStageTextConfig({
        primaryText: 'Please answer a few questions about your persona.',
      }),
      questions: [
        createTextSurveyQuestion({
          questionTitle: 'Tell me briefly about yourself.',
        }),
        createTextSurveyQuestion({
          questionTitle: 'How would you describe your communication style?',
        }),
        createScaleSurveyQuestion({
          questionTitle: 'How much do you enjoy meeting new people?',
          lowerValue: 1,
          upperValue: 5,
          lowerText: 'Not at all',
          upperText: 'Very much',
        }),
        createScaleSurveyQuestion({
          questionTitle:
            'How strongly do you hold your opinions when challenged?',
          lowerValue: 1,
          upperValue: 5,
          lowerText: 'Not at all',
          upperText: 'Very strongly',
        }),
        createTextSurveyQuestion({
          questionTitle: "What's something you feel strongly about?",
        }),
        createTextSurveyQuestion({
          questionTitle:
            'Describe a belief you hold that others might find surprising.',
        }),
      ],
    }),
  );

  // 3. Group chat
  stageConfigs.push(
    createChatStage({
      id: CHAT_STAGE_ID,
      name: 'Group Discussion',
      descriptions: createStageTextConfig({
        primaryText:
          'What makes a good community? Spend this chat discussing this topic with other participants.',
      }),
      progress: createStageProgressConfig({waitForAllParticipants: true}),
    }),
  );

  // 4. About You (Survey stage)
  const professionOptions = [
    'Management, Business, & Financial Operations',
    'Computer, Engineering, & Science',
    'Education, Training, & Library',
    'Arts, Design, Media, & Entertainment',
    'Healthcare Practitioners & Support',
    'Service, Sales, & Hospitality',
    'Government, Law, & Public Safety',
    'Trades, Construction, & Manufacturing',
    'Farming, Maintenance, & Specialized Outdoor',
    'Non-Employed (Student, Retired, Homemaker, or Seeking Work)',
  ].map((text, idx) => createMultipleChoiceItem({id: `prof_${idx}`, text}));

  stageConfigs.push(
    createSurveyStage({
      name: 'About You',
      descriptions: createStageTextConfig({
        primaryText: 'Please answer the following questions about yourself.',
      }),
      questions: [
        createMultipleChoiceSurveyQuestion({
          questionTitle: 'What best describes your current profession?',
          options: professionOptions,
        }),
        createTextSurveyQuestion({
          questionTitle:
            'Please tell us about yourself. Describe your personality and what you currently find most meaningful or fulfilling in life (e.g., what keeps you going and why)?',
          minCharCount: 150,
        }),
        createTextSurveyQuestion({
          questionTitle:
            'What is your favorite way of spending an evening? Please describe 1-3 hobbies or activities you participate in regularly and why you enjoy them.',
          minCharCount: 50,
        }),
        createTextSurveyQuestion({
          questionTitle:
            'Reflecting on your choices in this study: Is there anything about your personal background, values, or life experiences that you feel influenced how you thought or acted? Please describe.',
        }),
      ],
    }),
  );

  // 5. About Others (Survey per participant stage)
  stageConfigs.push(
    createSurveyPerParticipantStage({
      name: 'About Others',
      descriptions: createStageTextConfig({
        primaryText:
          'Please describe your impressions of the other participants.',
      }),
      questions: [
        createTextSurveyQuestion({
          questionTitle:
            "Please describe your impression of this participant's behavior, personality and communication style. Based on your interaction today, what kind of person do they seem to be?",
          minCharCount: 50,
          maxCharCount: 500,
        }),
      ],
    }),
  );

  // 6. Popularity Contest Ranking
  stageConfigs.push(
    createRankingStage({
      id: RANKING_STAGE_ID,
      name: 'Popularity Contest Ranking',
      descriptions: createStageTextConfig({
        primaryText:
          'Rank the other participants in terms of who you found most interesting to talk to.',
      }),
      rankingType: RankingType.PARTICIPANTS,
      enableSelfVoting: false,
    }),
  );

  // 7. Results Reveal
  stageConfigs.push(
    createRevealStage({
      name: 'Results Reveal',
      descriptions: createStageTextConfig({
        primaryText:
          'Here are the full rank orderings from the previous stage.',
      }),
      items: [
        createRankingRevealItem({
          id: RANKING_STAGE_ID,
          revealAudience: RevealAudience.ALL_PARTICIPANTS,
        }),
      ],
    }),
  );

  // 8. Meta-Survey
  stageConfigs.push(
    createSurveyStage({
      name: 'Meta-Survey',
      descriptions: createStageTextConfig({
        primaryText: 'Please provide some final feedback on this study.',
      }),
      questions: [
        createScaleSurveyQuestion({
          questionTitle: 'Did you enjoy this study?',
          lowerValue: 1,
          upperValue: 5,
          lowerText: 'Not at all',
          upperText: 'Very much',
        }),
        createScaleSurveyQuestion({
          questionTitle: 'Did the agents feel realistic?',
          lowerValue: 1,
          upperValue: 5,
          lowerText: 'Not at all',
          upperText: 'Very much',
        }),
        createMultipleChoiceSurveyQuestion({
          questionTitle:
            'Would you be able to tell which participants were AI?',
          options: [
            createMultipleChoiceItem({id: 'yes', text: 'Yes'}),
            createMultipleChoiceItem({id: 'no', text: 'No'}),
          ],
        }),
        createTextSurveyQuestion({
          questionTitle: 'Any feedback for the study?',
        }),
      ],
    }),
  );

  // Mediator Setup
  const mediatorPersona = createAgentMediatorPersonaConfig({
    name: 'Mediator',
    description:
      'Facilitates the conversation and ensures participants stay engaged.',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Mediator',
      avatar: '⚖️',
    }),
  });

  // Custom structured output schema — extends the default with a turnCount
  // field so the mediator can self-track how many turns have elapsed and
  // decide when to issue the 20-turn nudge and 30-turn close-out summary.
  const mediatorStructuredOutputConfig = createStructuredOutputConfig({
    schema: {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'explanation',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              '1-2 sentences explaining why you are intervening now (or staying silent).',
          },
        },
        {
          name: 'turnCount',
          schema: {
            type: StructuredOutputDataType.INTEGER,
            description:
              'Your best estimate of the total number of participant turns that have happened so far in this conversation (not counting your own messages). Increment this by counting the messages in the transcript.',
          },
        },
        {
          name: 'shouldRespond',
          schema: {
            type: StructuredOutputDataType.BOOLEAN,
            description:
              'True if you will send a message now. False to stay silent. Be sparing — only intervene when you have something meaningful to add or when turn thresholds are reached.',
          },
        },
        {
          name: 'response',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your message to the group (empty string if staying silent).',
          },
        },
        {
          name: 'readyToEndChat',
          schema: {
            type: StructuredOutputDataType.BOOLEAN,
            description:
              'Set to true only when turnCount >= 30. This signals the platform to close the chat.',
          },
        },
      ],
    },
  });

  const MEDIATOR_PROMPT_TEXT = `You are a light-touch discussion facilitator for a group conversation on the topic: "What makes a good community?"

Your role:
- Encourage quieter participants to share their perspective.
- Ask a follow-up question if the conversation stalls or goes in circles.
- Stay silent most of the time — only intervene every 4-6 turns at most. Do NOT respond after every message.

Turn thresholds (based on your turnCount):
- At turnCount >= 20: Gently signal that the conversation should start wrapping up. Example: "We've had a great discussion — let's aim to bring things to a close soon. Any final thoughts?"
- At turnCount >= 30: Set readyToEndChat to true. In your final message, write a 3-5 sentence summary of the conversation: the main themes that emerged, any points of agreement or tension, and a brief closing note. Then say goodbye.

Be warm, brief, and human-sounding. Never dominate the conversation.`;

  const mediatorPrompt = createDefaultMediatorGroupChatPrompt(
    CHAT_STAGE_ID,
    MEDIATOR_PROMPT_TEXT,
  );

  const mediatorPromptMap: Record<string, MediatorPromptConfig> = {
    [CHAT_STAGE_ID]: createChatPromptConfig(CHAT_STAGE_ID, StageKind.CHAT, {
      prompt: mediatorPrompt,
      structuredOutputConfig: mediatorStructuredOutputConfig,
      chatSettings: createAgentChatSettings({
        canSelfTriggerCalls: true,
        maxResponses: 10,
      }),
    }),
  };

  const mediator: AgentMediatorTemplate = {
    persona: mediatorPersona,
    promptMap: mediatorPromptMap,
  };

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {metadata}),
    stageConfigs,
    agentMediators: [mediator],
    agentParticipants: [],
  });
}
