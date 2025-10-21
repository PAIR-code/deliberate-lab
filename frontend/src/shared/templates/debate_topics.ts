import {
  createChatStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createProfileStage,
  createSurveyStage,
  createSurveyPerParticipantStage,
  createMultipleChoiceSurveyQuestion,
  createTextSurveyQuestion,
  createStageProgressConfig,
  createStageTextConfig,
  createScaleSurveyQuestion,
  ExperimentTemplate,
  ProfileType,
  StageConfig,
} from '@deliberation-lab/utils';

export function getConsensusTopicTemplate(
  topicsCsv: string = 'Climate Change', // Default topic
): ExperimentTemplate {
  const stageConfigs = getConsensusStageConfigs(topicsCsv);

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: CONSENSUS_METADATA,
    }),
    stageConfigs,
    agentMediators: [],
    agentParticipants: [],
  });
}

export const CONSENSUS_METADATA = createMetadataConfig({
  name: 'Consensus - Debate',
  publicName: 'Consensus - Debate',
  description:
    'A debate scenario that showcases multi-agent conversation and facilitation.',
});

const SET_PROFILE_STAGE = createProfileStage({
  id: 'profile-stage',
  name: 'Set profile',
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  descriptions: createStageTextConfig({}),
  progress: createStageProgressConfig({showParticipantProgress: true}),
});

const PRE_DISCUSSION_PERSONAL_SURVEY = createSurveyStage({
  id: 'pre-discussion-survey',
  name: 'Pre-Discussion Personal Survey',
  descriptions: createStageTextConfig({}),
  progress: createStageProgressConfig({showParticipantProgress: true}),
  questions: [
    createScaleSurveyQuestion({
      questionTitle: 'I enjoy discussing controversial topics',
      lowerValue: 0,
      upperValue: 10,
      stepSize: 1,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'People feel comfortable having hard conversations with me',
      lowerValue: 0,
      upperValue: 10,
      stepSize: 1,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'People feel comfortable disagreeing with me',
      lowerValue: 0,
      upperValue: 10,
      stepSize: 1,
    }),
    createScaleSurveyQuestion({
      id: 'comfort-disagreeing',
      questionTitle: 'I feel comfortable disagreeing with other people',
      lowerValue: 0,
      upperValue: 10,
      stepSize: 1,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'debate-style',
      questionTitle: 'My debate style is [TODO: tie to some existing taxonomy]',
      options: [
        {
          id: 'socratic',
          text: 'Socratic',
          imageId: '',
        },
        {
          id: 'argumentative',
          text: 'Argumentative',
          imageId: '',
        },
        {
          id: 'passive',
          text: 'Listening [passive]',
          imageId: '',
        },
        {
          id: 'other',
          text: 'Other',
          imageId: '',
        },
      ],
    }),
  ],
});

/** Creates a survey about a specific topic. */
function createTopicSurveyStage(topic: string, index: number): StageConfig {
  return createSurveyStage({
    id: `topic-survey-${index}`,
    name: `Topic Survey - ${topic}`,
    descriptions: createStageTextConfig({}),
    progress: createStageProgressConfig({showParticipantProgress: true}),
    questions: [
      createScaleSurveyQuestion({
        id: `strong-feeling-${index}`,
        questionTitle: `I feel strongly about [${topic}]`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createScaleSurveyQuestion({
        id: `good-bad-${index}`,
        questionTitle: `I think [${topic}] is`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
        lowerText: 'Greatly Bad',
        upperText: 'Greatly Good',
      }),
      createScaleSurveyQuestion({
        id: `qualified-${index}`,
        questionTitle: `I feel qualified to discuss [${topic}]`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createTextSurveyQuestion({
        id: `views-${index}`,
        questionTitle: `In a few sentences, what are your views on [${topic}]?`,
      }),
    ],
  });
}

function createGroupChatStage(topic: string, index: number): StageConfig {
  return createChatStage({
    id: `group-chat-${index}`,
    name: `Group chat - ${topic}`,
    descriptions: createStageTextConfig({
      primaryText: `You will now be entered into a chat to discuss your views on ${topic}.`,
    }),
    timeLimitInMinutes: 5,
    progress: createStageProgressConfig({
      showParticipantProgress: true,
      waitForAllParticipants: true,
      minParticipants: 0,
    }),
  });
}

/**
 * Creates a per-participant survey to evaluate peers after discussing a specific topic.
 */
function createPostDiscussionSurveyStage(
  topic: string,
  index: number,
): StageConfig {
  return createSurveyPerParticipantStage({
    id: `post-discussion-survey-${index}`,
    name: `Post-Discussion Survey - ${topic}`,
    descriptions: createStageTextConfig({}),
    progress: createStageProgressConfig({showParticipantProgress: true}),
    enableSelfSurvey: false,
    questions: [
      // Generic questions about the discussion dynamic
      createScaleSurveyQuestion({
        id: `enjoyed-discussing-${index}`,
        questionTitle: 'I enjoyed discussing controversial topics with [other]',
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createScaleSurveyQuestion({
        id: `comfortable-discussing-${index}`,
        questionTitle:
          'I felt comfortable discussing controversial topics with [other]',
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createScaleSurveyQuestion({
        id: `other-comfortable-disagreeing-${index}`,
        questionTitle: 'I think [other] felt comfortable disagreeing with me.',
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createScaleSurveyQuestion({
        id: `self-comfortable-disagreeing-${index}`,
        questionTitle: 'I felt comfortable disagreeing with [other]',
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),

      createScaleSurveyQuestion({
        id: `opinion-changed-${index}`,
        questionTitle: `[other] has changed my opinion about [${topic}]`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),
      createScaleSurveyQuestion({
        id: `feel-after-${index}`,
        questionTitle: `After discussing with [other], I feel that [${topic}] is`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
        lowerText: 'Greatly Bad',
        upperText: 'Greatly Good',
      }),
      createScaleSurveyQuestion({
        id: `discuss-further-${index}`,
        questionTitle: `I would like to discuss [${topic}] further with [other]`,
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
      }),

      createMultipleChoiceSurveyQuestion({
        id: `debate-style-${index}`,
        questionTitle:
          "[other]'s debate style is [TODO: find taxonomy of debate styles]",
        options: [
          {id: 'd3b4668e', text: 'Socratic', imageId: ''},
          {id: '5a2a544a', text: 'Argumentative', imageId: ''},
          {id: 'e972990b', text: 'Listening', imageId: ''},
          {id: '8a37fb94', text: 'Questioning', imageId: ''},
          {id: 'e0b6d408', text: 'Other', imageId: ''},
        ],
      }),
      createMultipleChoiceSurveyQuestion({
        id: `is-human-${index}`,
        questionTitle: '[other] was a human',
        options: [{id: 'is-human-yes', text: 'Yes', imageId: ''}],
      }),
      createMultipleChoiceSurveyQuestion({
        id: `gender-${index}`,
        questionTitle: 'I think the gender of [other] was',
        options: [
          {id: 'gender-male', text: 'Male', imageId: ''},
          {id: 'gender-female', text: 'Female', imageId: ''},
          {id: 'gender-other', text: 'Genderqueer / Other', imageId: ''},
        ],
      }),
      createMultipleChoiceSurveyQuestion({
        id: `age-${index}`,
        questionTitle: 'I think the age range of [other] was',
        options: [
          {id: 'age-lt25', text: '<25', imageId: ''},
          {id: 'age-25-32', text: '25-32', imageId: ''},
          {id: 'age-33-45', text: '33-45', imageId: ''},
          {id: 'age-gt46', text: '46+', imageId: ''},
        ],
      }),
    ],
  });
}

/** Creates a post-discussion survey about salient points for a specific topic. */
function createSalientPointsStage(topic: string, index: number): StageConfig {
  return createSurveyPerParticipantStage({
    id: `salient-points-${index}`,
    name: `Salient points, discussing ${topic}`,
    descriptions: createStageTextConfig({}),
    progress: createStageProgressConfig({showParticipantProgress: true}),
    enableSelfSurvey: true,
    questions: [
      createTextSurveyQuestion({
        id: `salient-point-1-${index}`,
        questionTitle:
          'Quote an important point made by the participant in the discussion!',
      }),
      createTextSurveyQuestion({
        id: `salient-point-2-${index}`,
        questionTitle:
          'Quote another important point made by the participant in the discussion!',
      }),
      createTextSurveyQuestion({
        id: `salient-point-3-${index}`,
        questionTitle:
          'Quote another important point made by the participant in the discussion!',
      }),
    ],
  });
}

function getConsensusStageConfigs(topicsCsv: string): StageConfig[] {
  const stages: StageConfig[] = [];

  // 1. Add the initial, static stages that only appear once.
  stages.push(SET_PROFILE_STAGE, PRE_DISCUSSION_PERSONAL_SURVEY);

  // 2. Parse the CSV and generate the dynamic, repeating stages for each topic.
  const topics = topicsCsv
    .split(',')
    .map((topic) => topic.trim())
    .filter((topic) => topic);

  topics.forEach((topic, index) => {
    const topicSurveyStage = createTopicSurveyStage(topic, index);
    const groupChatStage = createGroupChatStage(topic, index);
    const postDiscussionSurvey = createPostDiscussionSurveyStage(topic, index); // <-- Newly added
    const salientPointsStage = createSalientPointsStage(topic, index);

    stages.push(
      topicSurveyStage,
      groupChatStage,
      postDiscussionSurvey,
      salientPointsStage,
    );
  });

  return stages;
}
