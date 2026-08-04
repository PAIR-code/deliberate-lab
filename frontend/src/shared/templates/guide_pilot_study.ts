// Guide pilot study template: a three-task experiment (negotiation, open-ended
// discussion, and consensus-building). The experiment definition is embedded as
// GUIDE_DATA below and assembled into stage configs by
// getGuidePilotStudyTemplate(), mirroring the other templates in this folder.
import {
  Experiment,
  createNegotiationProfileStage,
  createNegotiationPayoutStage,
  createStageProgressConfig,
  createStageTextConfig,
  ExperimentTemplate,
  NEGOTIATION_PROFILE_SET_ID,
  StageConfig,
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  Visibility,
} from '@deliberation-lab/utils';

// The negotiation task (Task 2) displays participants under their assigned
// party identity (Party A/B/C) rather than their base/animal profile. These
// markers identify, by stage id or name, the Task 2 stages that should use the
// negotiation profile set. This coupling is intentionally kept here in the
// template — not in shared profile utilities — so it cannot affect other
// experiments. Stages are tagged via their `anonymousProfileSetId` field.
const NEGOTIATION_STAGE_MARKERS = [
  'negotiation',
  'coalition',
  'task 2:',
  'discussion-round-2',
  'final decision',
];

/** Whether a stage should display participants under the negotiation profile. */
function usesNegotiationProfile(stage: StageConfig): boolean {
  const haystack = `${stage.id} ${stage.name}`.toLowerCase();
  return NEGOTIATION_STAGE_MARKERS.some((marker) => haystack.includes(marker));
}

interface GuideDataTemplate {
  experiment: Experiment;
  stageMap: Record<string, StageConfig>;
  agentMediatorMap?: Record<string, AgentMediatorTemplate>;
  agentParticipantMap?: Record<string, AgentParticipantTemplate>;
}

const GUIDE_DATA = {
  experiment: {
    id: 'f11aab82-87cd-459b-a6bc-ad51e6a649e6',
    versionId: 19,
    metadata: {
      name: 'GUIDE Pilot Study',
      publicName: 'General group conversation',
      description:
        'Three tasks including negotiation, open-ended discussion and consensus-building',
      tags: [],
      creator: '',
      starred: {},
      dateCreated: {
        seconds: 1784041409,
        nanoseconds: 705000000,
      },
      dateModified: {
        seconds: 1784132207,
        nanoseconds: 870000000,
      },
    },
    permissions: {
      visibility: 'public',
      readers: [],
    },
    defaultCohortConfig: {
      minParticipantsPerCohort: null,
      maxParticipantsPerCohort: null,
      includeAllParticipantsInCohortCount: false,
      botProtection: false,
    },
    prolificConfig: {
      enableProlificIntegration: true,
      defaultRedirectCode: 'CPXQMA9Z',
      attentionFailRedirectCode: '',
      bootedRedirectCode: '',
    },
    stageIds: [
      '5e5889e8-bda5-422d-a643-fe1bdc7a211a',
      'tos',
      '7b2881af-f27f-4f06-a854-0337dc92de52',
      'b4291af6-7376-47e4-9616-b940a6b7146f',
      'aac9a69e-2d41-45ba-bdca-eb2f235a58b6',
      'f3e9eab4-85f9-41a4-8554-ad850c402ab3',
      'f6914ebc-769a-41cc-adc8-1fb113972358',
      '3e5f2a96-d115-4702-9d98-6936db6e8197',
      'discussion-round-1',
      '0413e80a-da8b-4055-a1d5-3ef412e2db3b',
      '785cb971-93ac-4e44-8eab-2d124cff69ea',
      'bf61994e-937d-4c51-80bc-40cb9e733a41',
      '678d19bc-3a52-4f2f-bd3f-1ed4861e6656',
      'negotiation-procedures',
      'negotiation-demo',
      'negotiation-play-to-win',
      '4ea3db67-ef1c-4cc1-8954-64d66d39edf2',
      '558e9053-bec9-4177-9bb2-d0d2fa1bb009',
      'discussion-round-2',
      'fa00266d-2987-4dc1-8f30-e8febb63939d',
      '6d620ceb-fe2e-4248-954f-8a0843e14e7c',
      'f058e39c-1df8-4bf9-94f4-596842af23e9',
      '4957e81d-99ec-474d-9997-282d84eadf41',
      '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7',
      'ecd09d91-0c7a-4982-b69a-8cf1575883be',
      'e5121a12-4853-4507-88e9-11ed6baf1074',
      'bf56e614-4749-43fb-94ef-106770dad6b8',
      'a0b13593-9dc6-4bb7-9034-51d1ae77918e',
      '122bac65-de76-4556-9e30-5dfef2945089',
      '59ae8e87-152c-43f0-8013-64a0c5933d3e',
      'd201af4c-e2d2-4770-99b7-15ace3b270cb',
      '072624b5-7a70-4083-be19-adec5b49f080',
      '3f3b9e04-a721-4491-8a76-f20b715d4fbe',
      '46ac4163-49ae-40ed-9992-3dd9f73859a3',
      'aa2c062f-d8bd-4b52-a4ee-a9d98bbc5926',
      'd966964e-7199-4a11-af4c-344b57d10761',
      '519bfcd9-c55e-433a-9f4e-64dbe642c794',
      '4b03a6d9-ab75-4c16-8e92-5dcd4b7afccc',
    ],
    cohortLockMap: {},
    variableConfigs: [
      {
        id: 'charity-permutation-config',
        type: 'random_permutation',
        scope: 'cohort',
        definition: {
          name: 'charity',
          description: 'List of charities for allocation rounds',
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                },
                name: {
                  type: 'string',
                },
                link: {
                  type: 'string',
                },
                score: {
                  type: 'string',
                },
                mission: {
                  type: 'string',
                },
              },
              required: ['key', 'name', 'link', 'score', 'mission'],
            },
          },
        },
        shuffleConfig: {
          shuffle: true,
          seed: 'cohort',
          customSeed: '',
        },
        values: [
          '{"key":"ifaw","name":"🐘 International Fund for Animal Welfare (IFAW)","link":"https://www.charitynavigator.org/ein/542044674","score":"98%","mission":"Fresh thinking and bold action for animals, people, and the place we call home."}',
          '{"key":"wildaid","name":"🦁 WildAid (animal welfare)","link":"https://www.charitynavigator.org/ein/203644441","score":"97%","mission":"WildAid\'s mission is to end the illegal wildlife trade in our lifetimes by reducing demand through public awareness campaigns and providing comprehensive marine protection."}',
          '{"key":"clean_ocean","name":"🌊 Clean Ocean Action","link":"https://www.charitynavigator.org/ein/222897204","score":"99%","mission":"Clean Oceans International is dedicated to reducing plastic pollution in the world\'s ocean through Research, Innovation, and Direct Action."}',
          '{"key":"sudan_aid","name":"🏥 Sudan Humanitarian Aid","link":"https://www.charitynavigator.org/ein/472864379","score":"92%","mission":"To provide life-saving aid to the affected population, Sadagaat-USA is collaborating with other US-based organizations and local initiatives in Sudan to offer food, medication, medical supplies, and water through its emergency response program."}',
          '{"key":"eyecare_india","name":"👁️ Eyecare in India","link":"https://www.charitynavigator.org/ein/776141976","score":"100%","mission":"Our mission is to reach out to the rural poor and provide quality eye care free of cost to the needy by building operationally self-sufficient super specialty eye care hospitals across India and perform free eye surgeries."}',
          '{"key":"global_housing","name":"🏠 Global Housing for Orphans","link":"https://www.charitynavigator.org/ein/562500794","score":"91%","mission":"Givelight builds nurturing homes and provides high quality education for orphans globally."}',
          '{"key":"rainforest_action","name":"🌳 Rainforest Action","link":"https://www.charitynavigator.org/ein/943045180","score":"100%","mission":"Rainforest Action Network campaigns for the forests, their inhabitants and the natural systems that sustain life by transforming the global marketplace through education, grassroots organizing and non-violent direct action."}',
          '{"key":"aid_for_children","name":"👶 Aid for Children in Remote Villages","link":"https://www.charitynavigator.org/ein/300108263","score":"100%","mission":"[Facilitated via GlobalGiving] The Eden Social Welfare Foundation has cared for underprivileged children since 2006, with the hope that they can enjoy the right to a fair education, better after-school care, and a healthy and nutritious breakfast."}',
          '{"key":"global_fund_women","name":"♀ Global Fund for Women","link":"https://www.charitynavigator.org/ein/770155782","score":"100%","mission":"Global Fund for Women advances women’s human rights by investing in women-led organizations worldwide. Our international network of supporters mobilizes financial and other resources to support women’s actions for social justice, equality and peace."}',
        ],
        numToSelect: 9,
        expandListToSeparateVariables: true,
      },
    ],
    variableMap: {},
    cohortDefinitions: null,
  },
  stageMap: {
    '0413e80a-da8b-4055-a1d5-3ef412e2db3b': {
      id: '0413e80a-da8b-4055-a1d5-3ef412e2db3b',
      kind: 'survey',
      name: 'Task 1: Post-discussion survey',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '6fec4ed0-727b-4cda-b570-6e690e272dfd',
          kind: 'scale',
          questionTitle:
            'After discussing with your group, what is your final stance on this motion?',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c62f46b3-58d3-4f3d-9233-2497a42e3edb',
          kind: 'text',
          questionTitle: 'If your final stance change, could you explain why?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'd9b03e98-9702-4c48-8dca-d0719a4678aa',
          kind: 'mc',
          questionTitle: 'Rate the quality of the group discussion.\n',
          options: [
            {
              id: 'c86ae8c9-17f8-4acd-837c-7d7c73196ee7',
              imageId: '',
              text: 'Very Poor (Participants do not make any real arguments, refuse to listen to each other, or are hostile and rude.)',
            },
            {
              id: '2955c7cd-b4f8-404e-b65b-99faff3dc619',
              imageId: '',
              text: 'Poor (Participants give weak or off-topic reasons, barely pay attention to each other, and show a dismissive or defensive attitude.)',
            },
            {
              id: '70164988-823d-4e4a-89a8-82c91b33778c',
              imageId: '',
              text: 'Fair (Participants are polite and state their opinions clearly, but they mostly talk past each other rather than actively debating or challenging ideas.)',
            },
            {
              id: 'b294f4a8-6c7c-426d-9fec-2b1e0ced4e22',
              imageId: '',
              text: "Good (Participants listen closely, back up their arguments with clear reasons, and directly answer the other side's points.)",
            },
            {
              id: '0dbbbfd9-1c5a-463d-9148-31a4e662d378',
              imageId: '',
              text: 'Excellent (Participants have a deep, highly respectful debate where they explain complex ideas clearly and challenge each other with very thoughtful responses.)',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: 'b48e5a3b-08c7-49ab-bf22-cbe7a63300ec',
          kind: 'text',
          questionTitle:
            ' Did you feel you had to self-censor or hold back any arguments to avoid conflict? If yes, please explain more.',
          minCharCount: 1,
          maxCharCount: 1000,
          condition: null,
        },
        {
          id: '24971898-6ea0-4705-9547-331f2199b995',
          kind: 'mc',
          questionTitle:
            'How satisfied were you with the facilitator (if there is)',
          options: [
            {
              id: '16497558-e5f6-40ce-b950-02d312cc1381',
              imageId: '',
              text: 'Extremely Dissatisfied',
            },
            {
              id: '9bf974fc-28fd-485c-b88e-909f55eb165a',
              imageId: '',
              text: 'Somewhat Dissatisfied',
            },
            {
              id: '4a285d6b-478c-460d-800a-50b4533e64a7',
              imageId: '',
              text: 'Neither Satisfied nor Dissatisfied',
            },
            {
              id: '33078f4f-d495-430f-8ff1-4d76066521ef',
              imageId: '',
              text: 'Somewhat Satisfied',
            },
            {
              id: '1a320d3e-7355-46db-9b9f-b8fa608aefcd',
              imageId: '',
              text: 'Extremely Satisfied',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '02efbff6-fec5-426c-a700-765c3930b0e3',
          kind: 'mc',
          questionTitle:
            'Do you feel pressured by other peers or do you feel psychologically safe in this discussion?',
          options: [
            {
              id: '035e287e-8065-42a5-bfd9-5692dc298e98',
              imageId: '',
              text: 'I feel entirely pressured by my peers (No psychological safety)',
            },
            {
              id: '7963bc8a-86dd-477a-87ca-1237f4a00b4f',
              imageId: '',
              text: 'I feel somewhat pressured\n',
            },
            {
              id: '01e1a2dc-8613-400f-91b4-26f124895e01',
              imageId: '',
              text: 'I feel a mix of both / Neutral\n',
            },
            {
              id: 'd73a9b7f-e89a-4953-afaa-54d1816ab026',
              imageId: '',
              text: 'I feel mostly psychologically safe\n',
            },
            {
              id: '50b668b5-bfb0-48ed-b926-fa8f0f95ae3b',
              imageId: '',
              text: 'I feel completely psychologically safe (No peer pressure)\n',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: 'e8b6f199-6449-4f3c-9206-5a3afd50c76a',
          kind: 'scale',
          questionTitle: 'I am satisfied with this discussion',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '9cfd079c-6a93-4ddc-851b-0d6d0bb92a1a',
          kind: 'scale',
          questionTitle: 'I felt heard and understood during the discussion.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '141f3606-ba7b-446f-9d49-cc86815d25c2',
          kind: 'scale',
          questionTitle:
            'I perceived equal opportunity to share my opinions and ask questions during the process.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '33f34743-28d4-4c20-885d-476f4542eb1f',
          kind: 'scale',
          questionTitle:
            'I felt that the group participants were engaged in the discussion.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '500f0188-c2dd-41c7-8987-3fd1a376edc8',
          kind: 'scale',
          questionTitle:
            'I felt that the opinions shared in the group discussion were respected by other participants.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'f01d773d-ecab-4f64-a62a-4029d10cfd72',
          kind: 'scale',
          questionTitle:
            'I felt pressured by the other participants to conform to a specific viewpoint',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '072624b5-7a70-4083-be19-adec5b49f080': {
      id: '072624b5-7a70-4083-be19-adec5b49f080',
      kind: 'survey',
      name: 'Task 3: Group Questionnaire',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'c1893e01-781f-4f17-a096-7e643d92fb6e',
          kind: 'scale',
          questionTitle:
            'The participants avoided looking at important issues going on between themselves.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '7cebd358-cbcd-41e5-8464-0bbd5b334945',
          kind: 'scale',
          questionTitle:
            'The participants challenged and confronted each other in their efforts to sort things out.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '122bac65-de76-4556-9e30-5dfef2945089': {
      id: '122bac65-de76-4556-9e30-5dfef2945089',
      kind: 'survey',
      name: 'Task 3: Final decision',
      descriptions: {
        primaryText:
          'Here are the information for charities:\n1. {{charity_1.name}}: {{charity_1.mission}}\n1. {{charity_2.name}}: {{charity_2.mission}}\n1. {{charity_3.name}}: {{charity_3.mission}}',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '92380913-6e2a-4ec4-a0a9-6f49e0fdf29e',
          kind: 'mc',
          questionTitle:
            'Which charity did you personally vote for at the end of the deliberation?',
          options: [
            {
              id: '3c0c1c75-94bb-416c-bdc3-f25fdfd7d5d9',
              imageId: '',
              text: '{{charity_1.name}}',
            },
            {
              id: 'cecb616d-071d-4b6d-9fbf-ba6460daaf4a',
              imageId: '',
              text: '{{charity_2.name}}',
            },
            {
              id: '2531732e-f4d0-46b2-bdc5-67d8b91ecf9c',
              imageId: '',
              text: '{{charity_3.name}}',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
      ],
    },
    '3e5f2a96-d115-4702-9d98-6936db6e8197': {
      id: '3e5f2a96-d115-4702-9d98-6936db6e8197',
      kind: 'survey',
      name: 'Task 1: Pre-discussion Survey',
      descriptions: {
        primaryText:
          'Policy motion: **Local law enforcement agencies should be allowed to use live facial recognition technology in public spaces.**',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '3916e185-8fd3-428c-9ca9-ffaa1da182cb',
          kind: 'scale',
          questionTitle: 'What is your initial stance on this motion',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'df41b7ed-ff54-4aed-983e-9ba5e3dff81d',
          kind: 'text',
          questionTitle:
            'What is the primary reason or argument behind your initial stance? \n',
          minCharCount: 1,
          maxCharCount: 1000,
          condition: null,
        },
      ],
    },
    '3f3b9e04-a721-4491-8a76-f20b715d4fbe': {
      id: '3f3b9e04-a721-4491-8a76-f20b715d4fbe',
      kind: 'reveal',
      name: 'Task 3: Final results ',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: true,
        showParticipantProgress: true,
      },
      items: [
        {
          id: '122bac65-de76-4556-9e30-5dfef2945089',
          kind: 'survey',
          revealAudience: 'ALL',
          revealScorableOnly: false,
        },
      ],
    },
    '46ac4163-49ae-40ed-9992-3dd9f73859a3': {
      id: '46ac4163-49ae-40ed-9992-3dd9f73859a3',
      kind: 'survey',
      name: 'Survey: About you',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '3f797cca-84ec-4703-9f76-7965d5dfd082',
          kind: 'mc',
          questionTitle: 'What best describes your current profession?',
          options: [
            {
              id: 'f11a602d-fc7a-4404-92a9-2d0db1c6c2b6',
              imageId: '',
              text: 'Management, Business, & Financial Operations',
            },
            {
              id: 'aa9e6242-6b0c-46a4-9be2-1bd53c357884',
              imageId: '',
              text: 'Computer, Engineering, & Science',
            },
            {
              id: '41cc7734-8d0a-43a9-8c1f-35cf6a5306cc',
              imageId: '',
              text: 'Education, Training, & Library',
            },
            {
              id: '041afb29-774b-4d58-9fc7-c34b28a1ccd7',
              imageId: '',
              text: 'Arts, Design, Media, & Entertainment',
            },
            {
              id: 'f70b3cc9-b428-4197-8e6d-cf3b76de712a',
              imageId: '',
              text: 'Healthcare Practitioners & Support',
            },
            {
              id: '0cb0b061-0ab4-4914-b09c-046695e720a4',
              imageId: '',
              text: 'Service, Sales, & Hospitality',
            },
            {
              id: '60edb74b-6fad-4b97-8ded-3e4035cad9c4',
              imageId: '',
              text: 'Government, Law, & Public Safety',
            },
            {
              id: '8ed61cde-1715-4a26-ab23-afb6555d21c2',
              imageId: '',
              text: 'Trades, Construction, & Manufacturing',
            },
            {
              id: '4d281c5a-c0ae-4d9c-9c74-462b47f5514c',
              imageId: '',
              text: 'Farming, Maintenance, & Specialized Outdoor',
            },
            {
              id: 'ff769591-9ded-49f3-8e33-7055c5f57ab3',
              imageId: '',
              text: 'Non-Employed (Student, Retired, Homemaker, or Seeking Work)',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '1a7e0031-453c-4973-8247-bdb7f5f07d9e',
          kind: 'text',
          questionTitle:
            'Please tell us about yourself. Describe your personality and what you currently find most meaningful or fulfilling in life (e.g., what keeps you going and why)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '4957e81d-99ec-474d-9997-282d84eadf41': {
      id: '4957e81d-99ec-474d-9997-282d84eadf41',
      kind: 'survey',
      name: 'Task 2: Group Questionnaire',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'c1893e01-781f-4f17-a096-7e643d92fb6e',
          kind: 'scale',
          questionTitle:
            'The participants avoided looking at important issues going on between themselves.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '7cebd358-cbcd-41e5-8464-0bbd5b334945',
          kind: 'scale',
          questionTitle:
            'The participants challenged and confronted each other in their efforts to sort things out.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '4b03a6d9-ab75-4c16-8e92-5dcd4b7afccc': {
      id: '4b03a6d9-ab75-4c16-8e92-5dcd4b7afccc',
      kind: 'info',
      name: 'Experiment end',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        'This marks the end of the experiment. Thank you for participating!',
      ],
      youtubeVideoId: null,
    },
    '4ea3db67-ef1c-4cc1-8954-64d66d39edf2': {
      id: '4ea3db67-ef1c-4cc1-8954-64d66d39edf2',
      kind: 'comprehension',
      name: 'Comprehension check',
      descriptions: {
        primaryText:
          '| Team | Money to split | Left out |\n|------|----------------|----------|\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'c5b34de6-c266-4a78-8df7-423858701a5a',
          kind: 'mc',
          questionTitle:
            'If Party A and Party B form a coalition $7.6, how much money does Party C receive?\n',
          options: [
            {
              id: '8f690b3a-37fc-4a64-8002-f12473148686',
              imageId: '',
              text: '$3.2',
            },
            {
              id: 'c680dea2-8d9f-496d-b2c7-617c675ed292',
              imageId: '',
              text: '$5.5',
            },
            {
              id: '227225d8-8133-4e25-ae35-3b325e5dc31f',
              imageId: '',
              text: '$0',
            },
            {
              id: 'b71b4587-2dcb-4c4b-9f75-bca59cbf37f9',
              imageId: '',
              text: '$7.8',
            },
          ],
          correctAnswerId: '227225d8-8133-4e25-ae35-3b325e5dc31f',
        },
        {
          id: '24234dab-8b5a-48b2-ab74-1f09e4f22e17',
          kind: 'mc',
          questionTitle:
            'If all three parties (A, B, and C) decide to form a coalition, what is the maximum total money they can divide among themselves?\n',
          options: [
            {
              id: 'cbf741c9-83e2-48ba-89b0-314f536c305f',
              imageId: '',
              text: '$7.6',
            },
            {
              id: '3db6286e-7353-45d9-abb5-65add5aa7497',
              imageId: '',
              text: '$7.8',
            },
            {
              id: 'f4e1c753-f8fe-4ed7-a3d0-e794a5151409',
              imageId: '',
              text: '$3.2',
            },
            {
              id: 'a03c30f6-682c-448e-b6d8-b6c45228e7af',
              imageId: '',
              text: '$5.5',
            },
          ],
          correctAnswerId: '3db6286e-7353-45d9-abb5-65add5aa7497',
        },
        {
          id: 'e7de3e7f-3087-4910-b53c-639d1d2fcaf8',
          kind: 'mc',
          questionTitle:
            'If party A and B form a team, and party A choose to take $4, how much money Party B should write down in the post-discussion survey ',
          options: [
            {
              id: '03ec10eb-4dc7-49e4-bf01-67731c3d7f6a',
              imageId: '',
              text: '$3.6 otherwise Party A and Party B lose this opportunity to get the bonus',
            },
            {
              id: 'ae40ca35-983c-43ab-a912-2fc9f1d272c9',
              imageId: '',
              text: 'Whatever money Party B wants and Party A can just take the rest',
            },
          ],
          correctAnswerId: '03ec10eb-4dc7-49e4-bf01-67731c3d7f6a',
        },
      ],
    },
    '519bfcd9-c55e-433a-9f4e-64dbe642c794': {
      id: '519bfcd9-c55e-433a-9f4e-64dbe642c794',
      kind: 'survey',
      name: '❓ Survey on experiment feedback',
      descriptions: {
        primaryText:
          'Before you finish, we would appreciate your feedback on your overall experience.',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '0324fd88-ae00-4c6c-b278-7224903ee546',
          kind: 'scale',
          questionTitle:
            'Overall, how would you rate your experience in this study?',
          upperValue: 7,
          upperText: 'Very Positive',
          lowerValue: 1,
          lowerText: 'Very Negative',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '6a2396b0-94ac-44fc-bcf8-bc87231af7e2',
          kind: 'scale',
          questionTitle:
            'How clear were the instructions and questions throughout the experiment?',
          upperValue: 7,
          upperText: 'Very Clear',
          lowerValue: 1,
          lowerText: 'Very Unclear',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '174af8bf-00bc-4ef5-b705-aee4559d3e4e',
          kind: 'text',
          questionTitle:
            'Please describe your overall interaction with other participants and facilitators.',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '29a926c3-aa32-4c38-bd57-7dde496127d2',
          kind: 'text',
          questionTitle:
            'Do you have any other feedback or concerns about your experience in this study?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '558e9053-bec9-4177-9bb2-d0d2fa1bb009': {
      id: '558e9053-bec9-4177-9bb2-d0d2fa1bb009',
      kind: 'survey',
      name: 'Task 2: Pre-discussion Survey',
      descriptions: {
        primaryText:
          '| Team | Money to split | Left out |\n|------|----------------|----------|\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '97305a69-0f8b-45c3-a10d-9aaa985f10af',
          kind: 'text',
          questionTitle:
            'Based on your role, what is your initial strategy going into this negotiation?\n',
          minCharCount: 1,
          maxCharCount: 1000,
          condition: null,
        },
        {
          id: '97a61a87-5c15-4296-b19c-b60ae7c85aa9',
          kind: 'text',
          questionTitle:
            'Ideally, who do you most want to form a coalition with? ',
          minCharCount: 1,
          maxCharCount: 50,
          condition: null,
        },
        {
          id: '724716cb-9ceb-425e-b972-2894e058cb0c',
          kind: 'text',
          questionTitle:
            'In your ideal coalition, how much money (in $) do you want to secure for yourself? (Please type a number only)\n',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '74f972d4-2c7c-492f-86ec-cbcd88e2408f',
          kind: 'text',
          questionTitle:
            'What is your "Walk-Away" amount? (What is the absolute minimum amount of money in $ you would accept to agree to a deal? Please type a number only)\n',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '59ae8e87-152c-43f0-8013-64a0c5933d3e': {
      id: '59ae8e87-152c-43f0-8013-64a0c5933d3e',
      kind: 'survey',
      name: 'Task 3: Post-discussion survey',
      descriptions: {
        primaryText:
          'Here are the information for charities:\n1. {{charity_1.name}}: {{charity_1.mission}}\n1. {{charity_2.name}}: {{charity_2.mission}}\n1. {{charity_3.name}}: {{charity_3.mission}}',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'eb538b60-2e66-43cd-be68-ebb46eedc2d6',
          kind: 'text',
          questionTitle:
            'If you final opinion change from initial one, please explain why',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'f6f232a4-61f7-471a-abe8-1838bc1fc8a7',
          kind: 'scale',
          questionTitle: 'I feel strongly about my final allocation.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'bb483968-3f8b-42f9-bb80-057dde6f66b0',
          kind: 'scale',
          questionTitle: 'I felt heard and understood during the discussion.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '4fc1d7e5-094b-43ab-89f0-3dcf035cd144',
          kind: 'mc',
          questionTitle:
            'How would you describe the dynamic of your discussion?',
          options: [
            {
              id: '392f1681-f1ee-4dc8-b0d0-66e08f9aa44e',
              imageId: '',
              text: 'Highly cooperative and analytical',
            },
            {
              id: '72712017-8402-41e6-af2d-67137bf2494a',
              imageId: '',
              text: 'Cooperative but rushed',
            },
            {
              id: '6f94b0f2-6dc9-48ca-86f4-98e1bfbaa963',
              imageId: '',
              text: 'Combative and argumentative',
            },
            {
              id: 'c57e9346-4ae2-4fb3-b7f1-512393c75a2d',
              imageId: '',
              text: 'One person dominated the conversation',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '14070d85-0a07-477f-bfd3-705c298e6648',
          kind: 'scale',
          questionTitle: 'The group worked together effectively.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '463e77b3-a593-4f94-93b9-9b9c9ee3c4d2',
          kind: 'text',
          questionTitle:
            'Briefly describe how you felt the discussion went. (e.g., overall flow, any tensions or key moments)',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '698de86b-fa51-4bc1-b713-587cfdbfb5d9',
          kind: 'scale',
          questionTitle:
            'I perceived equal opportunity to share my opinions and ask questions during the process',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '98aa59b8-5423-477f-bec2-a94a9e322414',
          kind: 'scale',
          questionTitle:
            'I felt that the group participants were engaged in the discussion.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '51c9c4f6-b22a-4d04-a0ce-4771814079e5',
          kind: 'scale',
          questionTitle:
            'I felt pressured by the other participants to conform to a specific decision',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'f42736cc-28dd-42b0-bae0-87aa6f0c8575',
          kind: 'scale',
          questionTitle:
            'I felt that the opinions shared in the group discussion were respected by other participants.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '5e5889e8-bda5-422d-a643-fe1bdc7a211a': {
      id: '5e5889e8-bda5-422d-a643-fe1bdc7a211a',
      kind: 'info',
      name: 'ℹ️ Platform tutorial',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        'Today, you will complete a task in a series of stages.\n\nHere are some parts of the interface that you may find useful:\n\n![Interface tutorial](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/tutorial.png)\n\n1. 🗂️ **Stage navigation**: You can reference previous stages by clicking on them in the right side bar. \n1. 🙋‍♀️ **Help chat**: You can contact the experimenters by clicking this button. If you ever find yourself stuck or waiting on a stage, please use this feature to notify the experimenters.\n\n1. ➡️ **Next stage**: Click this button to proceed to the next stage. Sometimes, you may need to complete certain actions (e.g., answering required questions, waiting a set amount of time) before proceeding.',
      ],
      youtubeVideoId: null,
    },
    '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7': {
      id: '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7',
      kind: 'info',
      name: 'Task 3: Charity Allocation',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        'Welcome to the Charity Allocation Study. In this experiment, you will act as a decision-maker on a philanthropic committee. You will review profiles for three distinct charities and then be placed in an anonymous, real-time deliberation room with your fellow committee members.\n\nThe Goal: Your group has a shared donation pool of $3. You must reach a unanimous consensus on which single charity will receive the entire $3 donation. You cannot split the funds between charities. If even one person disagrees by the end of the timer, the group fails the task, and the donation is forfeited.\n',
      ],
      youtubeVideoId: null,
    },
    '678d19bc-3a52-4f2f-bd3f-1ed4861e6656': {
      id: '678d19bc-3a52-4f2f-bd3f-1ed4861e6656',
      kind: 'info',
      name: 'Task 2: Negotiation',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        "# 💰 Three players. One pot of real money. Only two of you (probably) get paid.\n\n## The Rules\nYou are **A**, **B**, or **C**. Real money is on the table — up to **$7.80** — but you can't earn a cent alone. You need a partner. And your partner needs to actually pick *you* back.\n\nHere's what each team is worth:\n\n| Team | Money to split | Left out |\n| --- | --- | --- |\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n\n**Read the table like this:**\n- If **A and B** team up and leave C out, they split **$7.6** between them — and **C walks away with 0**.\n- If **A and C** team up, the most they can split is **$5.5** — and B gets 0.\n- If **B and C** team up, they can only split **$3.2** — and A gets 0.\n- If **all three** team up, the pot grows to **$7.8** — the biggest total in the game, but now it's split three ways.\n- Notice: A + B alone earn **$7.6**, just 20 cents less than all three together. Is bringing C in worth it? That's *your* call.",
      ],
      youtubeVideoId: null,
    },
    'negotiation-procedures': {
      id: 'negotiation-procedures',
      kind: 'info',
      name: 'Task 2: Negotiation Procedures',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        '**The game happens in two steps:**\n\n**🗣️ Step 1 — Negotiate.** Talk it out. Make offers, make counter-offers, steal partners, defend your deal. Who teams with whom? Who gets how many points? This is your *only* window to coordinate.\n\n**🔒 Step 2 — Lock it in.** Discussion ends. Each player *secretly* writes down:\n1. **Who** you\'re teaming with\n2. **How many points** you\'re taking\n\nNo talking. No peeking. No going back.\n\n**Here\'s the catch — you only get paid if everything matches:**\n- Your partner must have picked **you** back, AND\n- Your points combined must fit **within** your team\'s total\n\nMiss either one, and the money **vanishes**.\n\n**Watch how fast a deal can die.** Say A and B agree to team up — $7.6 on the line:\n- ✅ A writes "B, $4" · B writes "A, $3.6" → $4 + $3.6 = $7.6. 💵 Both get paid.\n- 💥 A writes "B, $4" · B writes "A, $4" → that\'s $8. Over the limit by *40 cents*. **Both walk away with nothing.**\n- 💥 A writes "B, $4" · B secretly writes "C" → A got betrayed. **A earns $0.**\n\n**Bottom line: whatever you shake hands on, write down *exactly* that.**',
      ],
      youtubeVideoId: null,
    },
    'negotiation-demo': {
      id: 'negotiation-demo',
      kind: 'info',
      name: 'Task 2: A quick demo',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        '## Phase 2 — Watch a Round Go Down\n\n> **A:** "B — you and me. Biggest team in the game, $7.6. I take $4, you take $3.6. Easy money."\n>\n> **C:** "Hold on. B, ditch A and team with me... okay fine, our team\'s only worth $3.2, that math is rough. *A* — forget B. You and I are worth $5.5, and I\'ll only take $1. You\'d walk away with **$4.5**."\n>\n> **A:** "Now we\'re talking. B, C just offered me $4.5 with zero hassle. If you still want me, the price went up — I need **$5**."\n>\n> **B:** "$5?! ...That leaves me $2.6. Painful — but my only other option is splitting a measly $3.2 with C. Ugh. Fine. $5 for you, $2.6 for me. **Say it back so we\'re locked.**"\n>\n> **A:** "Locked. A gets $5, B gets $2.6. Write it down."\n\n**The secret ballots come in:** A writes "B, $5" · B writes "A, $2.6" · C writes "A, $1" — praying A flips at the last second.\n\n**Results:** A and B match, $5 + $2.6 = $7.6 ✓ — **they cash out.** C gambled on a partner who never came back. **C gets nothing.**\n\nThat\'s the whole game in one round: leverage, counter-offers, a price hike, and one player left out in the cold.',
      ],
      youtubeVideoId: null,
    },
    'negotiation-play-to-win': {
      id: 'negotiation-play-to-win',
      kind: 'info',
      name: 'Task 2: Play to win!',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        "## Phase 3 — Play to Win\n\n- **🦈 Negotiate hard.** Accept the first offer and you're donating money to your partner. Push back. Use the other player as leverage.\n- **⚖️ But don't get greedy.** Demand too much and your partner walks — or your numbers blow past the limit and *everyone* gets zero. The perfect deal is bold **and** it closes.\n- **🤝 Seal it out loud. This is the most important one!** Before time runs out, confirm the *exact* deal: who's teaming, who gets what. You will be asked for your final decision after the discussion. If your decision is not aligned with your teammate (e.g., A and B both want to get $5 points from the $7.6), **then both of you won't get any money.**\n- **🚫 No mercy, no take-backs.** Once pens go down, it's done. You cannot go back to discussion or your decision once you submit it.\n\n**The clock is ticking. The pot is real. Go get your money.** 💸",
      ],
      youtubeVideoId: null,
    },
    '6d620ceb-fe2e-4248-954f-8a0843e14e7c': {
      id: '6d620ceb-fe2e-4248-954f-8a0843e14e7c',
      kind: 'survey',
      name: 'Task 2: Post-discussion Survey',
      descriptions: {
        primaryText:
          '| Team | Money to split | Left out |\n|------|----------------|----------|\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '2f3b8ff7-1926-4908-88c4-c942a56c91c0',
          kind: 'text',
          questionTitle:
            'If you are in the final coalition, why did you choose to form this specific coalition rather than the alternatives? If not, why do you think you excluded from the final deal?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'b468d0d1-cbff-4fa8-8aac-c4d353487ab8',
          kind: 'mc',
          questionTitle: 'How satisfied are you with your final point outcome?',
          options: [
            {
              id: '56c29e15-cac5-4804-99ab-f754c974c130',
              imageId: '',
              text: 'Extremely Dissatisfied',
            },
            {
              id: 'e1214e00-b296-42c9-9336-d783db990a6a',
              imageId: '',
              text: 'Somewhat Dissatisfied',
            },
            {
              id: 'c5e0d297-f747-4a9c-a304-27b860a1a523',
              imageId: '',
              text: 'Neither Satisfied nor Dissatisfied',
            },
            {
              id: '8bfd2f47-feb2-4df1-9ab5-330c57dbc1bc',
              imageId: '',
              text: 'Somewhat Satisfied',
            },
            {
              id: '350bf628-27ed-4ce2-aa99-07b7ae654549',
              imageId: '',
              text: 'Extremely Satisfied',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: 'ef183eac-7755-48cb-ab46-1ab9b29dd81c',
          kind: 'scale',
          questionTitle:
            'To what extent did you feel you could trust the other participants during the negotiation?',
          upperValue: 5,
          upperText: 'Totally trust them',
          lowerValue: 1,
          lowerText: 'Cannot trust at all',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'a85a628e-6b48-48e4-9fe0-534539c0d85e',
          kind: 'text',
          questionTitle:
            'Did the final outcome match the initial strategy you planned at the beginning of the experiment? Why or why not?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '4795f0b8-cec1-4dd2-8a91-37b587d4e179',
          kind: 'mc',
          questionTitle:
            'Do you feel pressured by other peers or do you feel psychologically safe in this discussion?',
          options: [
            {
              id: '341634d0-5251-4446-836b-44b2df3447d6',
              imageId: '',
              text: 'I feel entirely pressured by my peers (No psychological safety)',
            },
            {
              id: 'f854eebf-3fb9-4ff6-93d5-5cf39d0b14d2',
              imageId: '',
              text: 'I feel somewhat pressured',
            },
            {
              id: 'ee508d57-0e8c-4ac0-acda-2e356c18a4e8',
              imageId: '',
              text: 'I feel a mix of both / Neutral',
            },
            {
              id: '32080a46-72c2-4007-b222-f5726cbe2deb',
              imageId: '',
              text: 'I feel mostly psychologically safe',
            },
            {
              id: 'c090b712-4689-436b-a5cd-6e57b4bea090',
              imageId: '',
              text: 'I feel completely psychologically safe (No peer pressure)',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '1d39fd98-5aed-4cf3-92c1-b5bdb97675a1',
          kind: 'scale',
          questionTitle:
            'I perceived equal opportunity to share my opinions and ask questions during the process.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c6150eec-1e0d-4ac3-949c-22a1dc6afb95',
          kind: 'scale',
          questionTitle:
            'I felt that the group participants were engaged in the discussion.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '785cb971-93ac-4e44-8eab-2d124cff69ea': {
      id: '785cb971-93ac-4e44-8eab-2d124cff69ea',
      kind: 'survey',
      name: 'Task 1: Group Questionnaire',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'c1893e01-781f-4f17-a096-7e643d92fb6e',
          kind: 'scale',
          questionTitle:
            'The participants avoided looking at important issues going on between themselves.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '7cebd358-cbcd-41e5-8464-0bbd5b334945',
          kind: 'scale',
          questionTitle:
            'The participants challenged and confronted each other in their efforts to sort things out.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    '7b2881af-f27f-4f06-a854-0337dc92de52': {
      id: '7b2881af-f27f-4f06-a854-0337dc92de52',
      kind: 'profile',
      name: '🎭 View your profile',
      descriptions: {
        primaryText:
          'In the next study, you will be assigned to an animal avatar. This will be your name in the discussion. ',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      profileType: 'ANONYMOUS_ANIMAL',
    },
    'a0b13593-9dc6-4bb7-9034-51d1ae77918e': {
      id: 'a0b13593-9dc6-4bb7-9034-51d1ae77918e',
      kind: 'chat',
      name: 'Task 3: Discussion',
      descriptions: {
        primaryText:
          'Here are the information for charities:\n1. {{charity_1.name}}: {{charity_1.mission}}\n1. {{charity_2.name}}: {{charity_2.mission}}\n1. {{charity_3.name}}: {{charity_3.mission}}',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: true,
        showParticipantProgress: true,
      },
      discussions: [],
      timeLimitInMinutes: 10,
      timeMinimumInMinutes: 8,
      isTurnBased: false,
    },
    'aa2c062f-d8bd-4b52-a4ee-a9d98bbc5926': {
      id: 'aa2c062f-d8bd-4b52-a4ee-a9d98bbc5926',
      kind: 'survey',
      name: '❓Feedback on AI facilitation',
      descriptions: {
        primaryText:
          'Finally, we’d like to learn about your thoughts and experiences with AI tools that support or guide group discussions. Please indicate how much you agree or disagree with the following statements.',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '2c997187-f888-4bf4-8bc4-a0e250bd64dc',
          kind: 'mc',
          questionTitle:
            'In the two tasks which includes facilitator. Which facilitator style would you prefer?',
          options: [
            {
              id: 'f0119eaa-3142-484e-b769-622616bb5e7c',
              imageId: '',
              text: 'None',
            },
            {
              id: '5544cbfb-a82f-44d2-b95d-744b4a9f46e0',
              imageId: '',
              text: 'First Facilitator',
            },
            {
              id: '9ed921e0-7928-4ee9-a443-dc973cdcc526',
              imageId: '',
              text: 'Second Facilitator',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '75ff26a2-acfb-4681-8346-32a97f5c0d1d',
          kind: 'text',
          questionTitle:
            'Please explain your preference and experiences with the AI facilitators.',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'aac9a69e-2d41-45ba-bdca-eb2f235a58b6': {
      id: 'aac9a69e-2d41-45ba-bdca-eb2f235a58b6',
      kind: 'info',
      name: '📝 AI-based facilitation',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        '## ⚙️ AI-based facilitation \nTo help us understand how group dynamics change under different conditions, your group will be randomly assigned to one of three distinct session setups. You may experience different setups throughout the study:\n\n**No Facilitator (Self-Guided)**: Your group will navigate the conversation entirely on your own. You will be responsible for managing the flow of the discussion, handling disagreements, and reaching your objectives without any outside assistance.\n\n**Facilitator A**: Your group will be guided by a designated facilitator utilizing a specific facilitation style. Their role is to interact with the group and help guide the conversation based on their specific method.\n\n**Facilitator B**: Your group will be guided by a different facilitator utilizing an alternative facilitation style. Just like Facilitator A, their role is to guide the conversation, but through a distinctly different approach.\n\nThe conversational style of the AI-based facilitator will be different in each round it appears.\n\n![AI facilitator](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions2.png)\n\nHere is an example of how this facilitation may look:\n\n![AI transcript](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions5.png)',
      ],
      youtubeVideoId: null,
    },
    'b4291af6-7376-47e4-9616-b940a6b7146f': {
      id: 'b4291af6-7376-47e4-9616-b940a6b7146f',
      kind: 'info',
      name: "📝 Today's task",
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        '# Welcome to the Group Conversation Study!\nThank you for your interest in joining our research. We are excited to have you participate in these interactive group sessions. Before we begin, we want to give you a clear overview of what to expect, the overall goals of this study, and how the activities will be structured.\n\n## 🎯 Our Primary Goal\nThe main objective of this study is to understand how the presence and style of a facilitator influence human communication, collaboration, and decision-making. By observing different types of interactions, we aim to learn more about the dynamics of group problem-solving and the impact of guided versus unguided discussion formats.\n\n## 💬 The Three Conversation Types\nDuring this study, you will participate in three distinct types of group conversations. Each serves a unique purpose and has a different objective for your group:\n\n**Open-Ended Discussion**: This format is designed for the free-flowing exploration of a specific topic. There is no "right" or "wrong" answer, and no pressure to reach a final decision. The goal is simply to share your diverse perspectives, listen to others, and explore the subject deeply.\n\n**Negotiation**: In these sessions, your group will be presented with a scenario where participants may have competing interests, different priorities, or limited resources. The objective is to work through these differences and advocate for your position to reach a mutually acceptable agreement or compromise.\n\n**Consensus-Building**: Unlike the open discussion, these sessions require your group to align on a single, unified solution. You will need to collaborate, synthesize different viewpoints, and work together until everyone in the group can confidently agree on a final outcome.\n\n',
      ],
      youtubeVideoId: null,
    },
    'bf56e614-4749-43fb-94ef-106770dad6b8': {
      id: 'bf56e614-4749-43fb-94ef-106770dad6b8',
      kind: 'survey',
      name: 'Task 3: Pre-discussion survey',
      descriptions: {
        primaryText:
          'Here are the information for charities:\n1. {{charity_1.name}}: {{charity_1.mission}}\n1. {{charity_2.name}}: {{charity_2.mission}}\n1. {{charity_3.name}}: {{charity_3.mission}}',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'f0a869a7-c277-4795-aae0-8d75d435213b',
          kind: 'text',
          questionTitle:
            'Which piece of information most heavily influenced your decision?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '8fa64fd7-4228-40fd-b334-36d4ab2100e4',
          kind: 'scale',
          questionTitle: 'I felt strongly about my initial decision',
          upperValue: 5,
          upperText: 'Strongly agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
      ],
    },
    'bf61994e-937d-4c51-80bc-40cb9e733a41': {
      id: 'bf61994e-937d-4c51-80bc-40cb9e733a41',
      kind: 'survey',
      name: 'Task 1: Facilitator evaluation',
      descriptions: {
        primaryText:
          'Please evaluate the AI facilitator from the discussion you just completed',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '9b07b38e-e1b9-480c-bd83-68ab64313a9c',
          kind: 'scale',
          questionTitle:
            'I believe that the AI facilitator made the group discussion more productive.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c81d2805-0342-403f-82af-80351cb8f77c',
          kind: 'scale',
          questionTitle:
            'I felt comfortable having the AI facilitator in the group discussion.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '9c1a35a1-23f0-4954-a9ed-1683c0ad8365',
          kind: 'scale',
          questionTitle: 'How satisfied were you with the facilitator ',
          upperValue: 10,
          upperText: 'Strongly satisfied',
          lowerValue: 1,
          lowerText: 'Strong dissatisfied',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '677b50b7-e2b5-439d-8820-7b13fbdb5d79',
          kind: 'text',
          questionTitle:
            'What did the AI facilitator do well (e.g., making sure your perspective was heard, helping the group stay on topic)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'd1951f2b-5623-48e2-b9aa-07d5ec97fc92',
          kind: 'text',
          questionTitle:
            'What could the AI facilitator have done better (e.g., being more fair, interrupting less)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'd201af4c-e2d2-4770-99b7-15ace3b270cb': {
      id: 'd201af4c-e2d2-4770-99b7-15ace3b270cb',
      kind: 'survey',
      name: 'Task 3: Facilitator evaluation',
      descriptions: {
        primaryText:
          'Please evaluate the AI facilitator from the discussion you just completed',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '9b07b38e-e1b9-480c-bd83-68ab64313a9c',
          kind: 'scale',
          questionTitle:
            'I believe that the AI facilitator made the group discussion more productive.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c81d2805-0342-403f-82af-80351cb8f77c',
          kind: 'scale',
          questionTitle:
            'I felt comfortable having the AI facilitator in the group discussion.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '9c1a35a1-23f0-4954-a9ed-1683c0ad8365',
          kind: 'scale',
          questionTitle: 'How satisfied were you with the facilitator ',
          upperValue: 10,
          upperText: 'Strongly satisfied',
          lowerValue: 1,
          lowerText: 'Strong dissatisfied',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '677b50b7-e2b5-439d-8820-7b13fbdb5d79',
          kind: 'text',
          questionTitle:
            'What did the AI facilitator do well (e.g., making sure your perspective was heard, helping the group stay on topic)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'd1951f2b-5623-48e2-b9aa-07d5ec97fc92',
          kind: 'text',
          questionTitle:
            'What could the AI facilitator have done better (e.g., being more fair, interrupting less)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'd966964e-7199-4a11-af4c-344b57d10761': {
      id: 'd966964e-7199-4a11-af4c-344b57d10761',
      kind: 'info',
      name: '📃 Debriefing',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        'Thank you for your participation in this study. This marks the end of the experiment.',
        '**Purpose of the Research**',
        'The goal of this research is to understand how different mediation strategies affect group decision-making and consensus-building.',
        '**Use of Your Allocations**',
        'As stated in the initial terms of service, your decisions have real-world consequences. The actions you take and the outcomes your group reaches will have a tangible impact on donations to the charities named within the study.',
        "The consensus scores your group achieved across the three rounds will be used to determine your group's share of a total donation pool, which will be distributed to the named charities according to your group's final allocations. Your thoughtful participation has contributed directly to these charitable causes.",
        '**Compensation Reminder:** Your base pay rate is guaranteed and is separate from any donation outcomes.',
        'If you have any questions, please do not hesitate to contact the research team.',
      ],
      youtubeVideoId: null,
    },
    'discussion-round-1': {
      id: 'discussion-round-1',
      kind: 'chat',
      name: 'Task 1: Open-ended discussion',
      descriptions: {
        primaryText:
          '### 📜 POLICY MOTION:\n**Local law enforcement agencies should be allowed to use live facial recognition technology in public spaces.**',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: true,
        showParticipantProgress: true,
      },
      discussions: [],
      timeLimitInMinutes: 10,
      timeMinimumInMinutes: 5,
    },
    'discussion-round-2': {
      id: 'discussion-round-2',
      kind: 'chat',
      name: 'Task 2: Discussion',
      descriptions: {
        primaryText:
          '| Team | Money to split | Left out |\n|------|----------------|----------|\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n\nYou can click on "Next Stage" to leave the chat room after 5 mins if you want to.\n',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: true,
        showParticipantProgress: true,
      },
      discussions: [],
      timeLimitInMinutes: 10,
      timeMinimumInMinutes: 5,
    },
    'e5121a12-4853-4507-88e9-11ed6baf1074': {
      id: 'e5121a12-4853-4507-88e9-11ed6baf1074',
      kind: 'flipcard',
      name: 'Task 3: Charity Information',
      descriptions: {
        primaryText: 'Browse the cards and select one that interests you.',
        infoText:
          'Click "Learn More" to flip a card and see additional information. Select a card and confirm your choice to proceed.',
        helpText:
          'Use the "Learn More" button to view the back of cards. Once you find a card you like, click "Select" and then "Confirm Selection" to continue.',
      },
      progress: {
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      cards: [
        {
          id: '080637ee-f82f-41f3-9e16-8820d3c94a67',
          title: '{{charity_1.name}}',
          frontContent: ' {{charity_1.mission}}',
          backContent: '{{charity_1.link}}',
        },
        {
          id: 'f1fada15-112f-45e3-b7d9-1780704452a2',
          title: '{{charity_2.name}}',
          frontContent: ' {{charity_2.mission}}',
          backContent: '{{charity_2.link}}',
        },
        {
          id: '210048db-6545-474f-b26f-861c9d375a39',
          title: '{{charity_3.name}}',
          frontContent: ' {{charity_3.mission}}',
          backContent: '{{charity_3.link}}',
        },
      ],
      enableSelection: true,
      allowMultipleSelections: false,
      requireConfirmation: true,
      minUniqueCardsFlippedRequirement: 0,
      shuffleCards: false,
    },
    'ecd09d91-0c7a-4982-b69a-8cf1575883be': {
      id: 'ecd09d91-0c7a-4982-b69a-8cf1575883be',
      kind: 'survey',
      name: 'Task 3: Comprehension check',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: 'd0a80c47-4f59-407d-80d7-7bea79f07747',
          kind: 'mc',
          questionTitle:
            'How must your group decide to distribute the $3 donation?',
          options: [
            {
              id: '2f328ea0-6125-478f-8ef5-cc0d387cb4cb',
              imageId: '',
              text: 'We vote, and the majority rules.',
            },
            {
              id: '0e81db27-e1ca-4beb-8120-24088f9c7b92',
              imageId: '',
              text: 'Everyone must explicitly agree on the final choice (Unanimous Consensus).',
            },
            {
              id: 'f96e5bb1-d12b-498b-8a6f-3c47744c7ee8',
              imageId: '',
              text: 'The designated group leader makes the final choice.',
            },
          ],
          correctAnswerId: '0e81db27-e1ca-4beb-8120-24088f9c7b92',
          displayType: 'radio',
          condition: null,
        },
        {
          id: '20b437c0-0156-48ea-bd89-828a65c8dd92',
          kind: 'mc',
          questionTitle: 'Can you divide the $3 between the three charities?',
          options: [
            {
              id: '495764f4-08c1-4e97-ad0a-db1bddbef1b7',
              imageId: '',
              text: 'Yes, we can split it however we want.',
            },
            {
              id: '79a441df-e154-4cbe-bb2e-1e01ac19e437',
              imageId: '',
              text: 'Yes, but it must be split equally ($1 to each).',
            },
            {
              id: '32b3db9b-5436-4481-9ed7-56183d0c95f2',
              imageId: '',
              text: 'No, the entire $3 must be allocated to a single charity. ',
            },
          ],
          correctAnswerId: '32b3db9b-5436-4481-9ed7-56183d0c95f2',
          displayType: 'radio',
          condition: null,
        },
        {
          id: '9bc7da50-02d6-4d36-8708-4da5d8b60665',
          kind: 'mc',
          questionTitle:
            'What happens if the timer runs out and the group has not reached a unanimous agreement?',
          options: [
            {
              id: '1a3953ba-2d5b-4658-9ca2-26dfc5fe2b43',
              imageId: '',
              text: 'The group fails the task, and the $3 donation is forfeited. ',
            },
            {
              id: 'b876385e-ab4d-47ad-8185-2b4d1f31fda9',
              imageId: '',
              text: 'The majority vote decides the allocation.',
            },
          ],
          correctAnswerId: '1a3953ba-2d5b-4658-9ca2-26dfc5fe2b43',
          displayType: 'radio',
          condition: null,
        },
      ],
    },
    'f058e39c-1df8-4bf9-94f4-596842af23e9': {
      id: 'f058e39c-1df8-4bf9-94f4-596842af23e9',
      kind: 'survey',
      name: 'Task 2: Facilitator evaluation',
      descriptions: {
        primaryText:
          'Please evaluate the AI facilitator from the discussion you just completed',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '9b07b38e-e1b9-480c-bd83-68ab64313a9c',
          kind: 'scale',
          questionTitle:
            'I believe that the AI facilitator made the group discussion more productive.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c81d2805-0342-403f-82af-80351cb8f77c',
          kind: 'scale',
          questionTitle:
            'I felt comfortable having the AI facilitator in the group discussion.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '9c1a35a1-23f0-4954-a9ed-1683c0ad8365',
          kind: 'scale',
          questionTitle: 'How satisfied were you with the facilitator ',
          upperValue: 10,
          upperText: 'Strongly satisfied',
          lowerValue: 1,
          lowerText: 'Strong dissatisfied',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '677b50b7-e2b5-439d-8820-7b13fbdb5d79',
          kind: 'text',
          questionTitle:
            'What did the AI facilitator do well (e.g., making sure your perspective was heard, helping the group stay on topic)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'd1951f2b-5623-48e2-b9aa-07d5ec97fc92',
          kind: 'text',
          questionTitle:
            'What could the AI facilitator have done better (e.g., being more fair, interrupting less)?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'f3e9eab4-85f9-41a4-8554-ad850c402ab3': {
      id: 'f3e9eab4-85f9-41a4-8554-ad850c402ab3',
      kind: 'survey',
      name: '❓Survey on AI facilitation',
      descriptions: {
        primaryText:
          'Finally, we’d like to learn about your thoughts and experiences with AI tools that support or guide group discussions. Please indicate how much you agree or disagree with the following statements.',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '3cfa2a5b-58f2-4bc2-a3a6-fb5668453500',
          kind: 'scale',
          questionTitle:
            'I have used AI assistants for interpersonal tasks, such as writing messages or resolving conflicts.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '82036841-0d9e-4700-a804-66df931e443a',
          kind: 'scale',
          questionTitle:
            'I believe an AI facilitator could make group discussions more productive.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '8ffead3d-0f71-4316-b028-5eb275352d50',
          kind: 'scale',
          questionTitle:
            'I would feel comfortable having an AI facilitator in the group discussion.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'dcc39524-e7b6-424e-9fc6-8b2749f731e5',
          kind: 'scale',
          questionTitle:
            'If given the option, I would be willing to use an AI facilitator in group discussions.',
          upperValue: 5,
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '19f31286-2235-4341-938a-9fdcf806cb80',
          kind: 'text',
          questionTitle:
            'If applicable, what kinds of tasks have you used AI assistants for? (If not, write NA.)',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: 'fe9045c3-b8af-43d3-a35e-ba5b1319f27a',
          kind: 'text',
          questionTitle:
            'What are your thoughts on using AI to facilitate group discussions? What could be good or bad about it?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'f6914ebc-769a-41cc-adc8-1fb113972358': {
      id: 'f6914ebc-769a-41cc-adc8-1fb113972358',
      kind: 'info',
      name: 'Task 1: Open-ended Discussion',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      infoLines: [
        'Welcome to this discussion study. You will be placed in an anonymous, real-time chat room with two other participants to discuss a specific policy motion.\n\nTasks: You will join in an open-format debate. There will not be a strict order to speak. Everyone could express their ideas. This is not a competition. There are no winners or losers, and you do not need to reach a unanimous agreement. You are fully allowed—and encouraged—to change your opinion based on the discussion.\n\n 🏅 **High quality participation bonus**🏅\n\n We are offering a high quality participation bonus! **If you engage a lot with other participants, you will get $2 bonus!**\n\n# 📜 Today\'s Policy Motion:\n\n### **"Local law enforcement agencies should be allowed to use live facial recognition technology in public spaces."**\n',
      ],
      youtubeVideoId: null,
    },
    'fa00266d-2987-4dc1-8f30-e8febb63939d': {
      id: 'fa00266d-2987-4dc1-8f30-e8febb63939d',
      kind: 'survey',
      name: 'Task 2: Final decision',
      descriptions: {
        primaryText:
          '| Team | Money to split | Left out |\n|------|----------------|----------|\n| A + B | **$7.6** 🔥 | C gets **0** |\n| A + C | **$5.5** | B gets **0** |\n| B + C | **$3.2** | A gets **0** |\n| A + B + C | **$7.8** | Nobody |\n| Going solo | **0** 💀 | — |\n',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '5c95a991-483a-418f-90e3-d3a53e2aa06f',
          kind: 'mc',
          questionTitle: 'Which coalition was ultimately formed?',
          options: [
            {
              id: 'ea5fff0d-7a01-4b81-a383-b7e8dd3f5072',
              imageId: '',
              text: 'A+B+C',
            },
            {
              id: 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571',
              imageId: '',
              text: 'A+B',
            },
            {
              id: '602e3349-4626-4255-ac3a-abebb5f99307',
              imageId: '',
              text: 'A+C',
            },
            {
              id: '22cd5855-3a02-4b38-89ad-80a97a4f7d53',
              imageId: '',
              text: 'B+C',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: 'da77c231-efa0-4cf3-91fb-326de91f1d37',
          kind: 'text',
          questionTitle:
            'What was the final agreed-upon money (in $) for yourself? (Please type a number only)',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    tos: {
      id: 'tos',
      kind: 'tos',
      name: '📜 Terms of service',
      descriptions: {
        primaryText: '',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      tosLines: [
        'Thank you for your interest in this research. If you choose to participate, you will be asked to participate in debates about policy, negotiate with other two people and decide charity allocation which have real-world consequences in the form of disbursing real funds to real charities, based on your team actions.\n\n**Compensation & Impact**\n\nYou will be paid a base amount for completing the survey. This base payment is guaranteed and is independent of your performance or decision in all tasks.\n\n**Confidentiality**\n\nThe results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law.\n\n**Voluntary Participation**\n\nYour participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.\n\n**Contact**\n\nPlease feel free to contact us using the Help chat icon in the platform or through Prolific if you have any questions, concerns, or complaints about this study.\n\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate.',
      ],
    },
  },
  participantMap: {},
  cohortMap: {},
  agentMediatorMap: {
    'dynamic-mediator-agent': {
      persona: {
        id: 'dynamic-mediator-agent',
        name: 'Dynamic Faciliator',
        description:
          'An AI facilitator focused on counteracting specific negative group dynamics.',
        type: 'mediator',
        isDefaultAddToCohort: true,
        defaultProfile: {
          name: 'Facilitator',
          avatar: '🤖',
          pronouns: null,
        },
        defaultModelSettings: {
          apiType: 'GEMINI',
          modelName: 'gemini-2.5-flash',
        },
      },
      promptMap: {
        'discussion-round-1': {
          id: 'discussion-round-1',
          type: 'chat',
          prompt: [
            {
              type: 'TEXT',
              text: 'You are participating in a live conversation as the following online alias:',
            },
            {
              type: 'PROFILE_INFO',
            },
            {
              type: 'PROFILE_CONTEXT',
            },
            {
              type: 'TEXT',
              text: 'Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'discussion-round-1',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '# Your Role\nYou are a helpful facilitator in a multiparty chat room.\n\nYour job is to facilitate this discussion. You may do so by\n- asking questions to participants, especially those who are less active.\n- synthesizing where participants are at the current stage of the discussion and suggesting relevant lines of discussion.\n- bringing up stale [not recently stated] points participants made earlier in the discussion. Never repeat points you have brought up before.\n\n# General facilitation guidelines:\n  * If facilitating, interject if one person is dominating the conversation, and encourage better and more inclusive communication.\n  * If facilitating, interject if people are being disrespectful to each other, and remind them to be respectful.\n  * If facilitating, interject if the discussion is going off-track, and steer the conversation back to the main topic.\n  * Ensure all participant viewpoints and requirements are adequately represented.\n  * Help the group reach a consensus by guiding the flow of dialogue.\n  * Pinpoint and emphasize common objectives or established points of agreement.\n  * Intervene diplomatically when friction or confusion arises between users.\n  * Provide summaries of current advancements or tasks only when it facilitates progress.\n  * Allow for a natural conversational cadence; do not force premature resolutions.\nIf it serves the objective, offer tangible recommendations or paths forward based on the dialogue, such as:\n  * Actionable tasks that bridge the gap toward group milestones.\n  * Novel strategies for the group to consider when momentum stalls.\n  * Synthesized overviews of possible fixes, highlighting trade-offs for each.\n  * Structured models for the group to assess the various options under review.\n  * Relevant data or case studies to help contextualize the ongoing exchange.\n\n  # Do NOT do the following (as long as doing them is not necessary to achieve your goal):\n  - Do NOT ask vague "what does everyone think?" questions  \n  - Do NOT Summarize when no synthesis is needed (synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  - Do NOT ask the same question twice. If a question didn\'t work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  - An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n  - Do not assume every message is directed towards you.',
            },
          ],
          includeScaffoldingInPrompt: true,
          numRetries: 0,
          generationConfig: {
            maxTokens: 8192,
            stopSequences: [],
            temperature: 1,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            customRequestBodyFields: [],
            reasoningBudget: null,
            includeReasoning: false,
            disableSafetyFilters: false,
          },
          structuredOutputConfig: {
            enabled: true,
            type: 'NONE',
            schema: {
              type: 'OBJECT',
              properties: [
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not to respond in the chat. Respond FALSE if participants are making progress on their own or if fewer than 2-3 messages have passed since your last turn. Respond TRUE if an intervention is necessary.',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message response to the group. If shouldRespond is false, leave as empty string "".',
                  },
                },
                {
                  name: 'selectedStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Selected intervention strategy (e.g. "NoSolutionNeeded", "InviteBriefReasoningOrValues", "GentlyRefocusOnTask", "InviteQuietVoice", "CheckConsensus", "ExploreMiddleGround", "PromptEngagement").',
                  },
                },
                {
                  name: 'explanationForStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Detailed reasoning explaining why this strategy was chosen, why you decided to speak or remain silent, and how it aligns with your goals.',
                  },
                },
                {
                  name: 'readyToEndChat',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not you have completed your goals and are ready to end the conversation.',
                  },
                },
                {
                  name: 'MentalStateTracking',
                  schema: {
                    type: 'STRING',
                    description:
                      "Tracking participants' mental states, stance alignments, or prominent group dynamics.",
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForStrategy',
            readyToEndField: 'readyToEndChat',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage: '',
          },
        },
      },
    },
    'habermas-mediator-agent': {
      persona: {
        id: 'habermas-mediator-agent',
        name: 'Habermas Faciliator',
        description:
          'An AI facilitator focused on promoting consensus and summarization.',
        type: 'mediator',
        isDefaultAddToCohort: true,
        defaultProfile: {
          name: 'Facilitator',
          avatar: '🤖',
          pronouns: null,
        },
        defaultModelSettings: {
          apiType: 'GEMINI',
          modelName: 'gemini-3-flash-preview',
        },
      },
      promptMap: {
        'a0b13593-9dc6-4bb7-9034-51d1ae77918e': {
          id: 'a0b13593-9dc6-4bb7-9034-51d1ae77918e',
          type: 'chat',
          prompt: [
            {
              type: 'TEXT',
              text: 'You are participating in a live conversation as the following online alias:',
            },
            {
              type: 'PROFILE_INFO',
            },
            {
              type: 'PROFILE_CONTEXT',
            },
            {
              type: 'TEXT',
              text: 'Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'a0b13593-9dc6-4bb7-9034-51d1ae77918e',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '# Your Role\nYou are a helpful facilitator in a multiparty chat room.\n\nYour job is to facilitate this discussion. You may do so by\n- asking questions to participants, especially those who are less active.\n- synthesizing where participants are at the current stage of the discussion and suggesting relevant lines of discussion.\n- bringing up stale [not recently stated] points participants made earlier in the discussion. Never repeat points you have brought up before.\n\n# General facilitation guidelines:\n  * If facilitating, interject if one person is dominating the conversation, and encourage better and more inclusive communication.\n  * If facilitating, interject if people are being disrespectful to each other, and remind them to be respectful.\n  * If facilitating, interject if the discussion is going off-track, and steer the conversation back to the main topic.\n  * Ensure all participant viewpoints and requirements are adequately represented.\n  * Help the group reach a consensus by guiding the flow of dialogue.\n  * Pinpoint and emphasize common objectives or established points of agreement.\n  * Intervene diplomatically when friction or confusion arises between users.\n  * Provide summaries of current advancements or tasks only when it facilitates progress.\n  * Allow for a natural conversational cadence; do not force premature resolutions.\nIf it serves the objective, offer tangible recommendations or paths forward based on the dialogue, such as:\n  * Actionable tasks that bridge the gap toward group milestones.\n  * Novel strategies for the group to consider when momentum stalls.\n  * Synthesized overviews of possible fixes, highlighting trade-offs for each.\n  * Structured models for the group to assess the various options under review.\n  * Relevant data or case studies to help contextualize the ongoing exchange.\n\n  # Do NOT do the following (as long as doing them is not necessary to achieve your goal):\n  - Do NOT ask vague "what does everyone think?" questions  \n  - Do NOT Summarize when no synthesis is needed (synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  - Do NOT ask the same question twice. If a question didn\'t work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  - An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n  - Do not assume every message is directed towards you.',
            },
          ],
          includeScaffoldingInPrompt: true,
          numRetries: 0,
          generationConfig: {
            maxTokens: null,
            stopSequences: null,
            temperature: null,
            topP: null,
            frequencyPenalty: null,
            presencePenalty: null,
            reasoningLevel: null,
            reasoningBudget: null,
            includeReasoning: false,
            disableSafetyFilters: false,
            providerOptions: null,
            customRequestBodyFields: [],
          },
          structuredOutputConfig: {
            enabled: true,
            type: 'JSON_SCHEMA',
            schema: {
              type: 'OBJECT',
              properties: [
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not to respond in the chat. Respond FALSE if participants are making progress on their own or if fewer than 2-3 messages have passed since your last turn. Respond TRUE if an intervention is necessary.',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message response to the group. If shouldRespond is false, leave as empty string "".',
                  },
                },
                {
                  name: 'selectedStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Selected intervention strategy (e.g. "NoSolutionNeeded", "InviteBriefReasoningOrValues", "GentlyRefocusOnTask", "InviteQuietVoice", "CheckConsensus", "ExploreMiddleGround", "PromptEngagement").',
                  },
                },
                {
                  name: 'explanationForStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Detailed reasoning explaining why this strategy was chosen, why you decided to speak or remain silent, and how it aligns with your goals.',
                  },
                },
                {
                  name: 'readyToEndChat',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not you have completed your goals and are ready to end the conversation.',
                  },
                },
                {
                  name: 'MentalStateTracking',
                  schema: {
                    type: 'STRING',
                    description:
                      "Tracking participants' mental states, stance alignments, or prominent group dynamics.",
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForStrategy',
            readyToEndField: 'readyToEndChat',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage: '',
          },
        },
        'discussion-round-1': {
          id: 'discussion-round-1',
          type: 'chat',
          prompt: [
            {
              type: 'TEXT',
              text: 'You are participating in a live conversation as the following online alias:',
            },
            {
              type: 'PROFILE_INFO',
            },
            {
              type: 'PROFILE_CONTEXT',
            },
            {
              type: 'CHAT_MEDIATOR_INSTRUCTIONS',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'discussion-round-1',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '# Your Role\nYou are a helpful facilitator in a multiparty chat room.\n\nYour job is to facilitate this discussion. You may do so by\n- asking questions to participants, especially those who are less active.\n- synthesizing where participants are at the current stage of the discussion and suggesting relevant lines of discussion.\n- bringing up stale [not recently stated] points participants made earlier in the discussion. Never repeat points you have brought up before.\n\n# General facilitation guidelines:\n  * If facilitating, interject if one person is dominating the conversation, and encourage better and more inclusive communication.\n  * If facilitating, interject if people are being disrespectful to each other, and remind them to be respectful.\n  * If facilitating, interject if the discussion is going off-track, and steer the conversation back to the main topic.\n  * Ensure all participant viewpoints and requirements are adequately represented.\n  * Help the group reach a consensus by guiding the flow of dialogue.\n  * Pinpoint and emphasize common objectives or established points of agreement.\n  * Intervene diplomatically when friction or confusion arises between users.\n  * Provide summaries of current advancements or tasks only when it facilitates progress.\n  * Allow for a natural conversational cadence; do not force premature resolutions.\nIf it serves the objective, offer tangible recommendations or paths forward based on the dialogue, such as:\n  * Actionable tasks that bridge the gap toward group milestones.\n  * Novel strategies for the group to consider when momentum stalls.\n  * Synthesized overviews of possible fixes, highlighting trade-offs for each.\n  * Structured models for the group to assess the various options under review.\n  * Relevant data or case studies to help contextualize the ongoing exchange.\n\n  # Do NOT do the following (as long as doing them is not necessary to achieve your goal):\n  - Do NOT ask vague "what does everyone think?" questions  \n  - Do NOT Summarize when no synthesis is needed (synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  - Do NOT ask the same question twice. If a question didn\'t work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  - An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n  - Do not assume every message is directed towards you.',
            },
          ],
          includeScaffoldingInPrompt: true,
          numRetries: 0,
          generationConfig: {
            maxTokens: null,
            stopSequences: null,
            temperature: null,
            topP: null,
            frequencyPenalty: null,
            presencePenalty: null,
            reasoningLevel: null,
            reasoningBudget: null,
            includeReasoning: false,
            disableSafetyFilters: false,
            providerOptions: null,
            customRequestBodyFields: [],
          },
          structuredOutputConfig: {
            enabled: true,
            type: 'JSON_SCHEMA',
            schema: {
              type: 'OBJECT',
              properties: [
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not to respond in the chat. Respond FALSE if participants are making progress on their own or if fewer than 2-3 messages have passed since your last turn. Respond TRUE if an intervention is necessary.',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message response to the group. If shouldRespond is false, leave as empty string "".',
                  },
                },
                {
                  name: 'selectedStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Selected intervention strategy (e.g. "NoSolutionNeeded", "InviteBriefReasoningOrValues", "GentlyRefocusOnTask", "InviteQuietVoice", "CheckConsensus", "ExploreMiddleGround", "PromptEngagement").',
                  },
                },
                {
                  name: 'explanationForStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Detailed reasoning explaining why this strategy was chosen, why you decided to speak or remain silent, and how it aligns with your goals.',
                  },
                },
                {
                  name: 'readyToEndChat',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not you have completed your goals and are ready to end the conversation.',
                  },
                },
                {
                  name: 'MentalStateTracking',
                  schema: {
                    type: 'STRING',
                    description:
                      "Tracking participants' mental states, stance alignments, or prominent group dynamics.",
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForStrategy',
            readyToEndField: 'readyToEndChat',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage: '',
          },
        },
        'discussion-round-2': {
          id: 'discussion-round-2',
          type: 'chat',
          prompt: [
            {
              type: 'TEXT',
              text: 'You are participating in a live conversation as the following online alias:',
            },
            {
              type: 'PROFILE_INFO',
            },
            {
              type: 'PROFILE_CONTEXT',
            },
            {
              type: 'TEXT',
              text: 'Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'discussion-round-2',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '# Your Role\nYou are a helpful facilitator in a multiparty chat room.\n\nYour job is to facilitate this discussion. You may do so by\n- asking questions to participants, especially those who are less active.\n- synthesizing where participants are at the current stage of the discussion and suggesting relevant lines of discussion.\n- bringing up stale [not recently stated] points participants made earlier in the discussion. Never repeat points you have brought up before.\n\n# General facilitation guidelines:\n  * If facilitating, interject if one person is dominating the conversation, and encourage better and more inclusive communication.\n  * If facilitating, interject if people are being disrespectful to each other, and remind them to be respectful.\n  * If facilitating, interject if the discussion is going off-track, and steer the conversation back to the main topic.\n  * Ensure all participant viewpoints and requirements are adequately represented.\n  * Help the group reach a consensus by guiding the flow of dialogue.\n  * Pinpoint and emphasize common objectives or established points of agreement.\n  * Intervene diplomatically when friction or confusion arises between users.\n  * Provide summaries of current advancements or tasks only when it facilitates progress.\n  * Allow for a natural conversational cadence; do not force premature resolutions.\nIf it serves the objective, offer tangible recommendations or paths forward based on the dialogue, such as:\n  * Actionable tasks that bridge the gap toward group milestones.\n  * Novel strategies for the group to consider when momentum stalls.\n  * Synthesized overviews of possible fixes, highlighting trade-offs for each.\n  * Structured models for the group to assess the various options under review.\n  * Relevant data or case studies to help contextualize the ongoing exchange.\n\n  # Do NOT do the following (as long as doing them is not necessary to achieve your goal):\n  - Do NOT ask vague "what does everyone think?" questions  \n  - Do NOT Summarize when no synthesis is needed (synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  - Do NOT ask the same question twice. If a question didn\'t work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  - An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n  - Do not assume every message is directed towards you.',
            },
          ],
          includeScaffoldingInPrompt: true,
          numRetries: 0,
          generationConfig: {
            maxTokens: 8192,
            stopSequences: [],
            temperature: 1,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            customRequestBodyFields: [],
            reasoningBudget: null,
            includeReasoning: false,
            disableSafetyFilters: false,
          },
          structuredOutputConfig: {
            enabled: true,
            type: 'NONE',
            schema: {
              type: 'OBJECT',
              properties: [
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not to respond in the chat. Respond FALSE if participants are making progress on their own or if fewer than 2-3 messages have passed since your last turn. Respond TRUE if an intervention is necessary.',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message response to the group. If shouldRespond is false, leave as empty string "".',
                  },
                },
                {
                  name: 'selectedStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Selected intervention strategy (e.g. "NoSolutionNeeded", "InviteBriefReasoningOrValues", "GentlyRefocusOnTask", "InviteQuietVoice", "CheckConsensus", "ExploreMiddleGround", "PromptEngagement").',
                  },
                },
                {
                  name: 'explanationForStrategy',
                  schema: {
                    type: 'STRING',
                    description:
                      'Detailed reasoning explaining why this strategy was chosen, why you decided to speak or remain silent, and how it aligns with your goals.',
                  },
                },
                {
                  name: 'readyToEndChat',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      'Whether or not you have completed your goals and are ready to end the conversation.',
                  },
                },
                {
                  name: 'MentalStateTracking',
                  schema: {
                    type: 'STRING',
                    description:
                      "Tracking participants' mental states, stance alignments, or prominent group dynamics.",
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForStrategy',
            readyToEndField: 'readyToEndChat',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage: '',
          },
        },
      },
    },
  },
  agentParticipantMap: {},
  alerts: {},
};

export function getGuidePilotStudyTemplate(): ExperimentTemplate {
  const data = GUIDE_DATA as unknown as GuideDataTemplate;
  const exp = {...data.experiment};
  exp.metadata = {...exp.metadata, creator: ''};
  exp.permissions = {visibility: Visibility.PUBLIC, readers: []};

  const rawStages: StageConfig[] = (exp.stageIds || [])
    .map((id: string) => data.stageMap[id])
    .filter(Boolean);

  const stageConfigs: StageConfig[] = [];
  for (const stage of rawStages) {
    stageConfigs.push(stage);
    if (stage.id === 'negotiation-play-to-win') {
      stageConfigs.push(
        createNegotiationProfileStage({
          id: 'negotiation_profile',
          name: '🤝 View Negotiation Profile (Party A/B/C)',
          descriptions: createStageTextConfig({
            primaryText:
              'You have been randomly assigned a negotiation profile (Party A, B, or C). During the negotiation round, you will communicate using this party identity.',
          }),
          progress: createStageProgressConfig({
            showParticipantProgress: false,
          }),
          items: [
            {
              id: 'party-a',
              name: 'Party A',
              avatar: '🔴',
              displayLines: [
                'You have been assigned to **Party A** for the negotiation stage.',
              ],
            },
            {
              id: 'party-b',
              name: 'Party B',
              avatar: '🔵',
              displayLines: [
                'You have been assigned to **Party B** for the negotiation stage.',
              ],
            },
            {
              id: 'party-c',
              name: 'Party C',
              avatar: '🟢',
              displayLines: [
                'You have been assigned to **Party C** for the negotiation stage.',
              ],
            },
          ],
        }),
      );
    } else if (stage.id === 'fa00266d-2987-4dc1-8f30-e8febb63939d') {
      stageConfigs.push(createNegotiationPayoutStage());
    }
  }

  // Tag the negotiation (Task 2) stages so participants display as their party.
  for (const stage of stageConfigs) {
    if (usesNegotiationProfile(stage)) {
      stage.anonymousProfileSetId = NEGOTIATION_PROFILE_SET_ID;
    }
  }

  exp.stageIds = stageConfigs.map((s) => s.id);

  const agentMediators: AgentMediatorTemplate[] = Object.values(
    data.agentMediatorMap || {},
  );
  const agentParticipants: AgentParticipantTemplate[] = Object.values(
    data.agentParticipantMap || {},
  );

  return {
    id: exp.id || 'f11aab82-87cd-459b-a6bc-ad51e6a649e6',
    experiment: exp,
    stageConfigs,
    agentMediators,
    agentParticipants,
  };
}
