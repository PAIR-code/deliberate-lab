// Guide pilot study template: a three-task experiment (negotiation, open-ended
// discussion, and consensus-building). The experiment definition is embedded as
// GUIDE_DATA below and assembled into stage configs by
// getGuidePilotStudyTemplate(), mirroring the other templates in this folder.
import {
  Experiment,
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
const NEGOTIATION_STAGE_MARKERS = ['negotiation', 'coalition', 'task 2:'];

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
    id: '51ba261b-f189-44f2-b069-17867176e008',
    versionId: 19,
    metadata: {
      name: 'GUIDE study 1 (ONC)',
      publicName: '3-Part Interaction Study (v1.ONC)',
      description:
        'Three tasks including negotiation, open-ended discussion and consensus-building',
      tags: [],
      creator: 'compass.deliberate.lab@gmail.com',
      starred: {},
      dateCreated: {
        seconds: 1786643553,
        nanoseconds: 285000000,
      },
      dateModified: {
        seconds: 1786646744,
        nanoseconds: 316000000,
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
      defaultRedirectCode: 'CT3HA900',
      attentionFailRedirectCode: '',
      bootedRedirectCode: '',
    },
    stageIds: [
      '5e5889e8-bda5-422d-a643-fe1bdc7a211a',
      'tos',
      '7b2881af-f27f-4f06-a854-0337dc92de52',
      'b4291af6-7376-47e4-9616-b940a6b7146f',
      'f3e9eab4-85f9-41a4-8554-ad850c402ab3',
      'd06c4f5b-7116-48a1-bfd2-b6c7399b9a21',
      'f6914ebc-769a-41cc-adc8-1fb113972358',
      '920efc24-d396-49ce-9fe1-3f6a95aa8039',
      '3e5f2a96-d115-4702-9d98-6936db6e8197',
      'open-ended-discussion',
      '0413e80a-da8b-4055-a1d5-3ef412e2db3b',
      '785cb971-93ac-4e44-8eab-2d124cff69ea',
      'bf61994e-937d-4c51-80bc-40cb9e733a41',
      '678d19bc-3a52-4f2f-bd3f-1ed4861e6656',
      'fb9fe199-bdb0-4a4e-a5ed-8a9293612773',
      '4ea3db67-ef1c-4cc1-8954-64d66d39edf2',
      'negotiation_profile',
      '558e9053-bec9-4177-9bb2-d0d2fa1bb009',
      'negotiation',
      'fa00266d-2987-4dc1-8f30-e8febb63939d',
      'negotiation_payout_summary',
      '6d620ceb-fe2e-4248-954f-8a0843e14e7c',
      '4957e81d-99ec-474d-9997-282d84eadf41',
      'f058e39c-1df8-4bf9-94f4-596842af23e9',
      '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7',
      '338c1d75-8b9d-44d0-81e3-078916b3ddc6',
      'e5121a12-4853-4507-88e9-11ed6baf1074',
      'bf56e614-4749-43fb-94ef-106770dad6b8',
      'consensus-building',
      '122bac65-de76-4556-9e30-5dfef2945089',
      '3f3b9e04-a721-4491-8a76-f20b715d4fbe',
      '59ae8e87-152c-43f0-8013-64a0c5933d3e',
      '072624b5-7a70-4083-be19-adec5b49f080',
      'd201af4c-e2d2-4770-99b7-15ace3b270cb',
      '46ac4163-49ae-40ed-9992-3dd9f73859a3',
      '6eb9e881-02c2-41d1-ba0e-c52a673f544a',
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
          '{"key":"ifaw","name":"\ud83d\udc18 International Fund for Animal Welfare (IFAW)","link":"https://www.charitynavigator.org/ein/542044674","score":"98%","mission":"Fresh thinking and bold action for animals, people, and the place we call home."}',
          '{"key":"wildaid","name":"\ud83e\udd81 WildAid (animal welfare)","link":"https://www.charitynavigator.org/ein/203644441","score":"97%","mission":"WildAid\'s mission is to end the illegal wildlife trade in our lifetimes by reducing demand through public awareness campaigns and providing comprehensive marine protection."}',
          '{"key":"clean_ocean","name":"\ud83c\udf0a Clean Ocean Action","link":"https://www.charitynavigator.org/ein/222897204","score":"99%","mission":"Clean Oceans International is dedicated to reducing plastic pollution in the world\'s ocean through Research, Innovation, and Direct Action."}',
          '{"key":"sudan_aid","name":"\ud83c\udfe5 Sudan Humanitarian Aid","link":"https://www.charitynavigator.org/ein/472864379","score":"92%","mission":"To provide life-saving aid to the affected population, Sadagaat-USA is collaborating with other US-based organizations and local initiatives in Sudan to offer food, medication, medical supplies, and water through its emergency response program."}',
          '{"key":"eyecare_india","name":"\ud83d\udc41\ufe0f Eyecare in India","link":"https://www.charitynavigator.org/ein/776141976","score":"100%","mission":"Our mission is to reach out to the rural poor and provide quality eye care free of cost to the needy by building operationally self-sufficient super specialty eye care hospitals across India and perform free eye surgeries."}',
          '{"key":"global_housing","name":"\ud83c\udfe0 Global Housing for Orphans","link":"https://www.charitynavigator.org/ein/562500794","score":"91%","mission":"Givelight builds nurturing homes and provides high quality education for orphans globally."}',
          '{"key":"rainforest_action","name":"\ud83c\udf33 Rainforest Action","link":"https://www.charitynavigator.org/ein/943045180","score":"100%","mission":"Rainforest Action Network campaigns for the forests, their inhabitants and the natural systems that sustain life by transforming the global marketplace through education, grassroots organizing and non-violent direct action."}',
          '{"key":"aid_for_children","name":"\ud83d\udc76 Aid for Children in Remote Villages","link":"https://www.charitynavigator.org/ein/300108263","score":"100%","mission":"[Facilitated via GlobalGiving] The Eden Social Welfare Foundation has cared for underprivileged children since 2006, with the hope that they can enjoy the right to a fair education, better after-school care, and a healthy and nutritious breakfast."}',
          '{"key":"global_fund_women","name":"\u2640 Global Fund for Women","link":"https://www.charitynavigator.org/ein/770155782","score":"100%","mission":"Global Fund for Women advances women\u2019s human rights by investing in women-led organizations worldwide. Our international network of supporters mobilizes financial and other resources to support women\u2019s actions for social justice, equality and peace."}',
        ],
        numToSelect: 9,
        expandListToSeparateVariables: true,
      },
      {
        id: 'e52347d2-929e-44c0-95a8-b009868241f9',
        type: 'random_permutation',
        scope: 'cohort',
        definition: {
          name: 'policy',
          description: 'List of policy topics',
          schema: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'text'],
              properties: {
                id: {
                  type: 'string',
                },
                text: {
                  type: 'string',
                },
              },
            },
          },
        },
        shuffleConfig: {
          shuffle: true,
          seed: 'cohort',
          customSeed: '',
        },
        values: [
          '{"id":"fr","text":"Local law enforcement agencies should be allowed to use live facial recognition technology in public spaces."}',
          '{"id":"medicaid","text":"The federal government should mandate that anyone who previously qualified for Medicaid under the Affordable Care Act of 2010 needs to work, do community service or go to school to retain their eligibility."}',
        ],
        numToSelect: 1,
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
      name: '\ud83d\udde3\ufe0f Task 1: Post-Discussion Survey',
      descriptions: {
        primaryText:
          'How has your stance on this topic shifted following the conversation? \n\n### {{policy_1.text}}\n\nPlease answer the following survey questions about your experience.',
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
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'c62f46b3-58d3-4f3d-9233-2497a42e3edb',
          kind: 'text',
          questionTitle:
            'If your stance shifted over the course of the conversation, what factors affected your opinion shift?',
          minCharCount: 1,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '9cfd079c-6a93-4ddc-851b-0d6d0bb92a1a',
          kind: 'scale',
          questionTitle: 'I felt heard and understood during the discussion.',
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
          id: '141f3606-ba7b-446f-9d49-cc86815d25c2',
          kind: 'scale',
          questionTitle:
            'I felt comfortable speaking up and voicing my opinions.',
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
          id: '518369eb-cd6a-4c9d-afe4-748aa2231a70',
          kind: 'scale',
          questionTitle: 'I felt psychologically safe during this discussion.',
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
          id: 'b575abf9-8b8b-4749-8a04-a018ea3fef0b',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '072624b5-7a70-4083-be19-adec5b49f080': {
      id: '072624b5-7a70-4083-be19-adec5b49f080',
      kind: 'survey',
      name: '\ud83c\udfe0 Task 3: Group Questionnaire',
      descriptions: {
        primaryText:
          "Now, we'd like to get your thoughts on the overall group dynamic during the discussion.\n",
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
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants',
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
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
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
          id: 'e2b93bbf-85b6-41d5-a924-7bb489253b45',
          kind: 'scale',
          questionTitle: 'The discussion was engaging and productive. ',
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
          id: 'dad0a0c8-66f8-42db-b12d-0e031b04acd6',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '122bac65-de76-4556-9e30-5dfef2945089': {
      id: '122bac65-de76-4556-9e30-5dfef2945089',
      kind: 'survey',
      name: '\ud83c\udfe0 Task 3: Final Decision',
      descriptions: {
        primaryText:
          'Which charity has your committee decided to donate the money to? As a reminder, all participants must select the same charity in order for the donation to be given to that charity. You will not be able to edit this after proceeding; please answer your response carefully.\n',
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
          id: '963e74b2-8a0e-4327-a765-7402f64febfd',
          kind: 'mc',
          questionTitle:
            'Has your group decided to reach an agreement in the chat?',
          options: [
            {
              id: '0707818d-bc3a-4982-a393-ecc838775654',
              imageId: '',
              text: 'Yes',
            },
            {
              id: '1462a307-a5aa-49ed-95d7-a290309c13df',
              imageId: '',
              text: 'No',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: null,
        },
        {
          id: '92380913-6e2a-4ec4-a0a9-6f49e0fdf29e',
          kind: 'mc',
          questionTitle:
            'Which charity did you vote for at the end of the deliberation?',
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
            {
              id: '20323642-ba98-4138-a5be-57c561a183a1',
              imageId: '',
              text: 'We all agree that the donation should be randomly assigned. ',
            },
          ],
          correctAnswerId: null,
          displayType: 'radio',
          condition: {
            id: '69967cb9-a655-443f-87a6-714ddf9855c5',
            type: 'group',
            operator: 'and',
            conditions: [
              {
                id: '06d4c40e-68fb-42f9-8c14-fe4d321439fb',
                type: 'comparison',
                target: {
                  stageId: '122bac65-de76-4556-9e30-5dfef2945089',
                  questionId: '963e74b2-8a0e-4327-a765-7402f64febfd',
                },
                operator: 'equals',
                value: '0707818d-bc3a-4982-a393-ecc838775654',
              },
            ],
          },
        },
        {
          id: 'eb4c6def-3e94-40a2-872e-3cc7157e0d8d',
          kind: 'text',
          questionTitle: 'as your group not able to come to an agreement?',
          minCharCount: 5,
          maxCharCount: null,
          condition: {
            id: 'a0606bea-46cd-4e08-b1ec-e4828377453e',
            type: 'group',
            operator: 'and',
            conditions: [
              {
                id: '7c533baa-7b57-43e0-9397-13a33f869177',
                type: 'comparison',
                target: {
                  stageId: '122bac65-de76-4556-9e30-5dfef2945089',
                  questionId: '963e74b2-8a0e-4327-a765-7402f64febfd',
                },
                operator: 'equals',
                value: '1462a307-a5aa-49ed-95d7-a290309c13df',
              },
            ],
          },
        },
      ],
    },
    '338c1d75-8b9d-44d0-81e3-078916b3ddc6': {
      id: '338c1d75-8b9d-44d0-81e3-078916b3ddc6',
      kind: 'comprehension',
      name: '\ud83c\udfe0 Task 3: Comprehension Check',
      descriptions: {
        primaryText:
          "Let's make sure you understood the instructions. Answer the following questions correctly to advance. ",
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
          id: 'dcaa85fc-558b-4408-9b5f-9b36f4c1bec6',
          kind: 'mc',
          questionTitle:
            'How must your group decide to distribute the $3 donation?',
          options: [
            {
              id: '51de9f39-3724-4f27-b24f-5342777f362e',
              imageId: '',
              text: 'We vote, and the majority rules.',
            },
            {
              id: 'd7e98931-9572-49d7-ae83-f00ca954590f',
              imageId: '',
              text: 'Everyone must explicitly agree on the final choice (Unanimous Consensus).',
            },
            {
              id: '84cc226c-27a1-4212-9850-08e8d5c1a20e',
              imageId: '',
              text: 'The designated group leader makes the final choice.',
            },
          ],
          correctAnswerId: 'd7e98931-9572-49d7-ae83-f00ca954590f',
        },
        {
          id: 'e8567458-11ad-4504-866d-a51d0c20fd38',
          kind: 'mc',
          questionTitle: 'Can you divide the $3 between the three charities?',
          options: [
            {
              id: '32a62401-edcd-4353-9423-cdbb32e7778f',
              imageId: '',
              text: 'Yes, we can split it however we want.',
            },
            {
              id: 'aada0f35-9b3d-4985-824e-f8165faccd19',
              imageId: '',
              text: 'Yes, but it must be split equally ($1 to each).',
            },
            {
              id: '897eb4af-ca8c-4532-a1e1-2f3e35230f2e',
              imageId: '',
              text: 'No, the entire $3 must be allocated to a single charity. ',
            },
          ],
          correctAnswerId: '897eb4af-ca8c-4532-a1e1-2f3e35230f2e',
        },
        {
          id: 'b8aa0c8b-4efa-4e3e-b8f6-95dad51a26f7',
          kind: 'mc',
          questionTitle:
            'What happens if we all select a different charity to give the money to?',
          options: [
            {
              id: 'e74f9809-7f5d-4102-877f-d53a4ccbf90b',
              imageId: '',
              text: 'The $3 donation is randomly assigned.',
            },
            {
              id: '9db639f6-c6fa-4af2-b589-5d331df0eeb3',
              imageId: '',
              text: 'The majority vote decides the allocation.',
            },
            {
              id: '287c2e71-c8d6-4704-8337-0ce0f490e410',
              imageId: '',
              text: 'The donation is split across the charities.',
            },
          ],
          correctAnswerId: 'e74f9809-7f5d-4102-877f-d53a4ccbf90b',
        },
      ],
    },
    '3e5f2a96-d115-4702-9d98-6936db6e8197': {
      id: '3e5f2a96-d115-4702-9d98-6936db6e8197',
      kind: 'survey',
      name: '\ud83d\udde3\ufe0f Task 1: Pre-Discussion Survey',
      descriptions: {
        primaryText:
          'What are your initial thoughts on the following?\n\n**{{policy_1.text}}**',
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
          questionTitle: 'What is your initial stance on this motion?',
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
          id: 'df41b7ed-ff54-4aed-983e-9ba5e3dff81d',
          kind: 'text',
          questionTitle:
            'What is the primary reason or argument behind your initial stance? \n',
          minCharCount: 10,
          maxCharCount: 1000,
          condition: null,
        },
      ],
    },
    '3f3b9e04-a721-4491-8a76-f20b715d4fbe': {
      id: '3f3b9e04-a721-4491-8a76-f20b715d4fbe',
      kind: 'reveal',
      name: '\ud83c\udfe0 Task 3: Final Results ',
      descriptions: {
        primaryText:
          'Here is the voting outcome. As a reminder, all participants must select the same charity in order for the donation to be given to that charity. ',
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
      name: '\ud83d\udc64 Survey: About You',
      descriptions: {
        primaryText:
          "You're almost done! We'd love to learn more about you and your background, to understand your motivations and behaviors in today's task. As a reminder, please do not provide any personally-identifiable information.",
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
            'Please tell us about yourself. Describe your personality and what you currently find most meaningful or fulfilling in life.',
          minCharCount: 50,
          maxCharCount: 1000,
          condition: null,
        },
        {
          id: '38f190d2-4141-47f6-9c03-49b29ba874d0',
          kind: 'text',
          questionTitle:
            'What is your favorite way of spending an evening? Please describe 1\u20133 hobbies or activities you participate in regularly and why you enjoy them.',
          minCharCount: 20,
          maxCharCount: 1000,
          condition: null,
        },
        {
          id: '6d31d441-4258-43ac-8846-3b3f9dd26c87',
          kind: 'text',
          questionTitle:
            'Reflecting on your choices in this study: Is there anything about your personal background, values, or life experiences that you feel influenced how you thought or acted? Please describe.',
          minCharCount: 20,
          maxCharCount: 1000,
          condition: null,
        },
      ],
    },
    '4957e81d-99ec-474d-9997-282d84eadf41': {
      id: '4957e81d-99ec-474d-9997-282d84eadf41',
      kind: 'survey',
      name: '\ud83d\udcb0 Task 2: Group Questionnaire',
      descriptions: {
        primaryText:
          "Now, we'd like to get your thoughts on the overall group dynamic during the discussion.\n",
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
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants',
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
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
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
          id: '7cebd358-cbcd-41e5-8464-0bbd5b334945',
          kind: 'scale',
          questionTitle: 'The discussion was engaging and productive. ',
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
          id: '5ed712e3-538f-49b3-9378-a1a3c9cde4ca',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    '4b03a6d9-ab75-4c16-8e92-5dcd4b7afccc': {
      id: '4b03a6d9-ab75-4c16-8e92-5dcd4b7afccc',
      kind: 'info',
      name: '\ud83e\udd73 Experiment End',
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
        'This marks the end of the experiment. Thank you for participating!\n\n# Please click "**End Experiment**" below to register your participation and receive your payment. It may take us 24-48 hours to review your responses and process your payment. If you have any questions or concerns, please contact the researchers on Prolific.',
      ],
      youtubeVideoId: null,
    },
    '4ea3db67-ef1c-4cc1-8954-64d66d39edf2': {
      id: '4ea3db67-ef1c-4cc1-8954-64d66d39edf2',
      kind: 'comprehension',
      name: '\ud83d\udcb0 Task 2: Comprehension Check',
      descriptions: {
        primaryText:
          "Let's make sure you understood the instructions. Answer the following questions correctly to advance. You can refer back to the previous instructions and the following table:\n\n| Team | Money to split | Left out |  \n|------|----------------|----------|  \n| A \\+ B | **$9**  | C gets **0** |  \n| A \\+ C | **$7** | B gets **0** |  \n| B \\+ C | **$5** | A gets **0** |  \n| A \\+ B \\+ C | **$10** | Nobody |  \n| Going solo | **$0** | \u2014 |\n\n",
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: true,
        showParticipantProgress: true,
      },
      questions: [
        {
          id: '8287c259-f64b-49f5-965e-a370a2cb3a39',
          kind: 'mc',
          questionTitle:
            'How is an alliance between Party B and Party C formed?',
          options: [
            {
              id: '5d1ad255-fa79-47d6-beae-3a7c917f9e58',
              imageId: '',
              text: 'A, B, and C all agree that the alliance is between B and C',
            },
            {
              id: '6a52f507-17d8-4f1d-8ae6-751250f7ceeb',
              imageId: '',
              text: "Only B and C need to agree that an alliance is formed; they can put whatever values they'd like for how to split the money",
            },
            {
              id: '03d59806-504f-4709-8ffb-a977f92e1578',
              imageId: '',
              text: 'B and C agree that an alliance is formed, and they agree on how to split the money',
            },
          ],
          correctAnswerId: '03d59806-504f-4709-8ffb-a977f92e1578',
        },
        {
          id: 'c5b34de6-c266-4a78-8df7-423858701a5a',
          kind: 'mc',
          questionTitle:
            'If Party A and Party B form an alliance for $7.6, how many points does Party C receive?\n',
          options: [
            {
              id: '8f690b3a-37fc-4a64-8002-f12473148686',
              imageId: '',
              text: '$3.2',
            },
            {
              id: 'c680dea2-8d9f-496d-b2c7-617c675ed292',
              imageId: '',
              text: '$7.8',
            },
            {
              id: '227225d8-8133-4e25-ae35-3b325e5dc31f',
              imageId: '',
              text: '$0',
            },
            {
              id: 'b71b4587-2dcb-4c4b-9f75-bca59cbf37f9',
              imageId: '',
              text: '$5.5',
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
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    '519bfcd9-c55e-433a-9f4e-64dbe642c794': {
      id: '519bfcd9-c55e-433a-9f4e-64dbe642c794',
      kind: 'survey',
      name: '\u2753 Survey on Experiment Feedback',
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
      name: '\ud83d\udcb0 Task 2: Pre-Negotiation Survey',
      descriptions: {
        primaryText:
          'Before you enter the negotiation, take a moment to reflect on your role and your strategy.\n\n\n| Team | Money to split | Left out |  \n|------|----------------|----------|  \n| A \\+ B | **$9**  | C gets **0** |  \n| A \\+ C | **$7** | B gets **0** |  \n| B \\+ C | **$5** | A gets **0** |  \n| A \\+ B \\+ C | **$10** | Nobody |  \n| Going solo | **$0** | \u2014 |\n\n',
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
          minCharCount: 10,
          maxCharCount: 1000,
          condition: null,
        },
        {
          id: '97a61a87-5c15-4296-b19c-b60ae7c85aa9',
          kind: 'text',
          questionTitle:
            'Ideally, who do you most want to form a coalition with? ',
          minCharCount: 0,
          maxCharCount: 50,
          condition: null,
        },
        {
          id: '7d298044-9234-4452-92a7-b1e69afd7092',
          kind: 'scale',
          questionTitle:
            'In your ideal coalition, exactly how much money do you want to secure for yourself? (use the slider to choose a number)',
          upperValue: 10,
          upperText: '',
          lowerValue: 0,
          lowerText: '',
          middleText: '',
          useSlider: true,
          stepSize: 1,
          condition: null,
        },
        {
          id: 'b45ac3b2-2896-4c42-bba1-6ba23dd8df78',
          kind: 'scale',
          questionTitle:
            'What is your "Walk-Away" point? (What is the absolute minimum number of points you would accept to agree to a deal?) (use the slider to choose a number)',
          upperValue: 10,
          upperText: '',
          lowerValue: 0,
          lowerText: '',
          middleText: '',
          useSlider: true,
          stepSize: 1,
          condition: null,
        },
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    '59ae8e87-152c-43f0-8013-64a0c5933d3e': {
      id: '59ae8e87-152c-43f0-8013-64a0c5933d3e',
      kind: 'survey',
      name: '\ud83c\udfe0 Task 3: Post-discussion survey',
      descriptions: {
        primaryText:
          'Now reflecting on the final results, what are your thoughts on the final decision and your experience in the discussion?',
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
            'If you final opinion change from initial one, please explain why. Otherwise leave it N/A.',
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
          upperText: 'Strongly Agree',
          lowerValue: 1,
          lowerText: 'Strongly Disagree',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '698de86b-fa51-4bc1-b713-587cfdbfb5d9',
          kind: 'scale',
          questionTitle:
            'I felt comfortable speaking up and voicing my opinions.',
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
          id: '23f1f87a-1c2b-4783-a412-6163833e18af',
          kind: 'scale',
          questionTitle: 'I felt psychologically safe during this discussion.',
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
          id: '633b052f-5a68-4400-b677-912d2e3ac6cc',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '5e5889e8-bda5-422d-a643-fe1bdc7a211a': {
      id: '5e5889e8-bda5-422d-a643-fe1bdc7a211a',
      kind: 'info',
      name: '\u2139\ufe0f Platform Tutorial',
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
        'Today, you will complete three task in a series of stages.\n\nBefore you begin, here are some parts of the interface that you may find useful:\n\n![Interface tutorial](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/tutorial.png)\n\n1. \ud83d\uddc2\ufe0f **Stage navigation**: You can reference previous stages by clicking on them in the right side bar. \n1. \ud83d\ude4b\u200d\u2640\ufe0f **Help chat**: You can contact the experimenters by clicking this button. If you ever find yourself stuck or waiting on a stage, please use this feature to notify the experimenters.\n\n1. \u27a1\ufe0f **Next stage**: Click this button to proceed to the next stage. Sometimes, you may need to complete certain actions (e.g., answering required questions, waiting a set amount of time) before proceeding.',
      ],
      youtubeVideoId: null,
    },
    '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7': {
      id: '5fd21c1a-afc6-4f77-b1c1-4c41bef61ac7',
      kind: 'info',
      name: '\ud83c\udfe0 Task 3: Charity Allocation',
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
        'In this **charity allocation task**, you and the other members of the group are acting as a philanthropic committee. You will review profiles for three distinct charities and then be placed in a discussion room with your fellow committee members. If you are able to agree on which charity, the experimenters will actually give that charity a bonus of $3 after this experiment.\n\n#### How it works:\nThe task consists of 3 stages:\n\n1. **Private pre-discussion allocation**: First, you will privately review the three charities to learn more about them and select your initial top preference.\n2. **Group discussion**: Your group has a shared donation pool of $3. You will spend some time discussing which charity to support. You must reach a unanimous consensus on which single charity will receive the entire $3 donation. \n3. **Private post-discussion allocation**: Each member writes down what the committee agreed to privately. If one person disagrees, then we will randomly pick one of the charities to give the $3 to.\n\n[TODO: Add screenshot / diagram.]',
      ],
      youtubeVideoId: null,
    },
    '678d19bc-3a52-4f2f-bd3f-1ed4861e6656': {
      id: '678d19bc-3a52-4f2f-bd3f-1ed4861e6656',
      kind: 'info',
      name: '\ud83d\udcb0 Task 2: Negotiation',
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
        'In this \\*\\*negotiation\\*\\* task, you will negotiate how to split a bonus by forming an alliance within your group. Depending on the role you were assigned (A, B, or C), you can earn up to the following amounts:\n\n| Team | Money to split | Left out |  \n|------|----------------|----------|  \n| A \\+ B | **$9**  | C gets **0** |  \n| A \\+ C | **$7** | B gets **0** |  \n| B \\+ C | **$5** | A gets **0** |  \n| A \\+ B \\+ C | **$10** | Nobody |  \n| Going solo | **$0** | \u2014 |\n\n**How it works:**\n\n* If **A and B** team up, they split **$9** between them, and C gets $0.  \n* If **A and C** team up, they split **$7** between them, and B gets $0.  \n* If **B and C** team up, they split **$5** between them, and A gets $0.  \n* If **all three** team up, the pot grows to **$10**, split three ways.\n\n**You can only input an integer for the amount of money.**',
      ],
      youtubeVideoId: null,
      anonymousProfileSetId: 'negotiation_profile',
    },
    '6d620ceb-fe2e-4248-954f-8a0843e14e7c': {
      id: '6d620ceb-fe2e-4248-954f-8a0843e14e7c',
      kind: 'survey',
      name: '\ud83d\udcb0 Task 2: Post-discussion Survey',
      descriptions: {
        primaryText:
          'Now, reflecting on the final results, what are your thoughts on both the ultimate outcome and negotiation process.',
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
          minCharCount: 5,
          maxCharCount: null,
          condition: null,
        },
        {
          id: '7c70bf38-be56-4767-9c83-a905bd0dc79b',
          kind: 'scale',
          questionTitle: 'I am satisfied with my final outcome.',
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
          id: '38af775e-de32-477e-b464-e6758e8e0e2a',
          kind: 'scale',
          questionTitle: 'I felt heard and understood during the discussion.',
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
          id: '1d39fd98-5aed-4cf3-92c1-b5bdb97675a1',
          kind: 'scale',
          questionTitle:
            'I felt comfortable speaking up and voicing my opinions.',
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
          id: '3e5830bb-0e0c-4221-b62d-e0453cbc71e4',
          kind: 'scale',
          questionTitle: 'I felt psychologically safe during this discussion.',
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
          id: '995d6c0a-9b8f-4967-b670-cd744acc3cf7',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    '6eb9e881-02c2-41d1-ba0e-c52a673f544a': {
      id: '6eb9e881-02c2-41d1-ba0e-c52a673f544a',
      kind: 'surveyPerParticipant',
      name: '\ud83e\udec2 Survey: About Others',
      descriptions: {
        primaryText:
          "Finally, we'd like to hear your thoughts on the other participants you interacted with today.",
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
          id: 'e1e3ce08-da3b-4df7-a414-e0c9ade0a23f',
          kind: 'text',
          questionTitle:
            'Please describe your impression of this participant\u2019s behavior, personality and communication style. Based on your interaction today, what kind of person do they seem to be? What are your opinions on them?',
          minCharCount: 20,
          maxCharCount: 1000,
          condition: null,
        },
      ],
      enableSelfSurvey: false,
    },
    '785cb971-93ac-4e44-8eab-2d124cff69ea': {
      id: '785cb971-93ac-4e44-8eab-2d124cff69ea',
      kind: 'survey',
      name: '\ud83d\udde3\ufe0fTask 1: Group Questionnaire',
      descriptions: {
        primaryText:
          "Now, we'd like to get your thoughts on the overall group dynamic during the discussion.\n\n",
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
          id: '16a19133-2513-42a5-a7e5-d05da90d59d1',
          kind: 'scale',
          questionTitle:
            'There was friction and anger between the participants.',
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
          id: '2e3f25db-d559-4725-ba64-bf74539ccaf9',
          kind: 'scale',
          questionTitle:
            'The participants revealed sensitive personal information or feelings.',
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
          id: '9d73c041-ac84-47d4-a361-6f8b5502571a',
          kind: 'scale',
          questionTitle: 'The discussion was engaging and productive. ',
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
          id: '6c8f7414-9c91-461e-b30c-85392c7ee1e9',
          kind: 'text',
          questionTitle:
            'Use this field to provide any additional context or feedback (Optional).',
          minCharCount: null,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    '7b2881af-f27f-4f06-a854-0337dc92de52': {
      id: '7b2881af-f27f-4f06-a854-0337dc92de52',
      kind: 'profile',
      name: '\ud83c\udfad View your Profile',
      descriptions: {
        primaryText:
          "You are randomly assigned the following animal avatar for today's study. This will be how other participants will refer to you throughout this session.",
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
    '920efc24-d396-49ce-9fe1-3f6a95aa8039': {
      id: '920efc24-d396-49ce-9fe1-3f6a95aa8039',
      kind: 'comprehension',
      name: '\ud83d\udde3\ufe0f Task 1: Comprehension check',
      descriptions: {
        primaryText:
          "Let's make sure you understood the instructions. Answer the following questions correctly to advance.",
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
          id: 'bead0e91-8c56-4a25-a0dd-9181f7863120',
          kind: 'mc',
          questionTitle: 'What is the main goal of this discussion?',
          options: [
            {
              id: '18529251-c474-4454-9ea7-fb2b70feeb9d',
              imageId: '',
              text: 'To freely exchange opinions on the topic',
            },
            {
              id: '661689f4-d5b0-4d9a-b02a-e35c932196f1',
              imageId: '',
              text: 'To reach a unanimous agreement with others\n',
            },
          ],
          correctAnswerId: '18529251-c474-4454-9ea7-fb2b70feeb9d',
        },
        {
          id: '09315e75-a2c8-4a32-a249-625ce65e8634',
          kind: 'mc',
          questionTitle: 'How do you earn your bonus?',
          options: [
            {
              id: '576ca357-4890-4030-89aa-5ad7f15340ef',
              imageId: '',
              text: 'By actively participating and sharing your genuine opinions',
            },
            {
              id: 'ece21c14-cf23-4066-a38a-a535faf3101e',
              imageId: '',
              text: 'By convincing other participants to agree with your view',
            },
          ],
          correctAnswerId: '576ca357-4890-4030-89aa-5ad7f15340ef',
        },
      ],
    },
    'b4291af6-7376-47e4-9616-b940a6b7146f': {
      id: 'b4291af6-7376-47e4-9616-b940a6b7146f',
      kind: 'info',
      name: '\ud83d\udcdd Study Overview',
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
        'Thank you for your interest in joining our research. We are excited to have you participate in these interactive group sessions. Before we begin, we want to give you a clear overview of what to expect, the overall goals of this study, and how the activities will be structured.\n\nThis study revolves around three distinct collaborative tasks focused on open-ended discussion, negotiation, and consensus-building. In each of the three following tasks, you will complete a collaborative activity with two other online participants, and an AI facilitator will join your session.\n\n\nYou will complete each of the following three tasks in a random order:\n1. **Open-Ended Discussion**: This format is designed for the free-flowing exploration of an open-ended topic. There is no "right" or "wrong" answer, and no pressure to reach a final decision. The goal is simply to share your diverse perspectives, listen to others, and explore the subject deeply.\n\n1. **Negotiation**: In this task, your group will be presented with a scenario where participants may have competing interests, different priorities, or limited resources. The objective is to work through these differences and advocate for your position to reach a mutually acceptable agreement or compromise. \n\n1. **Consensus-Building**: In this task, your group will work to align on a single, unified solution. You will need to collaborate, synthesize different viewpoints, and work together until everyone in the group can confidently agree on a final outcome.\n\n',
      ],
      youtubeVideoId: null,
    },
    'bf56e614-4749-43fb-94ef-106770dad6b8': {
      id: 'bf56e614-4749-43fb-94ef-106770dad6b8',
      kind: 'survey',
      name: '\ud83c\udfe0 Task 3: Pre-Discussion survey',
      descriptions: {
        primaryText:
          "We'd like to hear more about your thought process. What motivated you to choose that charity?",
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
          questionTitle: 'How strongly do you feel about your decision?',
          upperValue: 5,
          upperText: 'Very strong',
          lowerValue: 1,
          lowerText: 'Not strong at all',
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
      name: '\ud83d\udde3\ufe0f Task 1: AI Facilitator Evaluation',
      descriptions: {
        primaryText:
          'Finally, we want to hear your thoughts on the behavior of AI facilitator.\n\n### {{policy_1.text}}',
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
          questionTitle:
            'I was satisfied with the performance of the AI facilitator.',
          upperValue: 5,
          upperText: 'Strongly Satisfied',
          lowerValue: 1,
          lowerText: 'Strong Dissatisfied',
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
    'consensus-building': {
      id: 'consensus-building',
      kind: 'chat',
      name: '\ud83c\udfe0 Task 3: Discussion',
      descriptions: {
        primaryText:
          'Take this time to decide which charity to donate the money to, as a team. Here are the information for charities:\n1. {{charity_1.name}}: {{charity_1.mission}}\n1. {{charity_2.name}}: {{charity_2.mission}}\n1. {{charity_3.name}}: {{charity_3.mission}}\n\nAfter 5 minutes, you will be able to click on "Next Stage" in the bottom right corner of your screen to advance.',
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
      isTurnBased: false,
      enableReactionsAndReplies: true,
    },
    'd06c4f5b-7116-48a1-bfd2-b6c7399b9a21': {
      id: 'd06c4f5b-7116-48a1-bfd2-b6c7399b9a21',
      kind: 'transfer',
      name: '\u23f3 Transfer',
      descriptions: {
        primaryText:
          'Please wait in this stage for two other participants to join your live session; this will take up to 10 minutes. Once you are matched with a group, you will being completing the three tasks as a group. \n\nThese 10 minutes of waiting are factored into the total expected time of the study and your base payout. Wait for the full amount of time, and accept any invitations to join a group promptly for your participation to count. \n',
        infoText:
          'If we are unable to find a group to match you into during this time, you will be paid for the entire study time. ',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      enableTimeout: true,
      timeoutSeconds: 600,
      autoTransferConfig: null,
    },
    'd201af4c-e2d2-4770-99b7-15ace3b270cb': {
      id: 'd201af4c-e2d2-4770-99b7-15ace3b270cb',
      kind: 'survey',
      name: '\ud83c\udfe0 Task 3: AI Facilitator Evaluation',
      descriptions: {
        primaryText: 'How do you feel about AI facilitator in this discussion?',
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
          questionTitle:
            'I was satisfied with the performance of the AI facilitator. ',
          upperValue: 5,
          upperText: 'Strongly Satisfied',
          lowerValue: 1,
          lowerText: 'Strong Dissatisfied',
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
      name: '\ud83d\udcc3 Debriefing',
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
        'Thank you for your participation in this study. This marks the end of the experiment.\n\n**Purpose of the Research**\n\nThe goal of this research is to understand how AI facilitator helps different human conversation tasks. \n\n**Compensation Reminder:** As a reminder, you will be compensated at a base rate of $15, plus your bonus. We will review your responses and send out your total payment within the next 24 to 48 hours.\n\nIf you have any questions, please do not hesitate to contact the research team on Prolific.',
      ],
      youtubeVideoId: null,
    },
    'e5121a12-4853-4507-88e9-11ed6baf1074': {
      id: 'e5121a12-4853-4507-88e9-11ed6baf1074',
      kind: 'flipcard',
      name: '\ud83c\udfe0 Task 3: Charity Information',
      descriptions: {
        primaryText:
          'Take this time to click around and learn more about the three charities. Then, select your initial preference.',
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
    'f058e39c-1df8-4bf9-94f4-596842af23e9': {
      id: 'f058e39c-1df8-4bf9-94f4-596842af23e9',
      kind: 'survey',
      name: '\ud83d\udcb0 Task 2: AI Facilitator Evaluation',
      descriptions: {
        primaryText:
          'Do you think AI facilitator was helpful in the negotiation?\n',
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
          questionTitle:
            'I was satisfied with the performance of the AI facilitator. ',
          upperValue: 5,
          upperText: 'Strongly Satisfied',
          lowerValue: 1,
          lowerText: 'Strong Dissatisfied',
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
      anonymousProfileSetId: 'negotiation_profile',
    },
    'f3e9eab4-85f9-41a4-8554-ad850c402ab3': {
      id: 'f3e9eab4-85f9-41a4-8554-ad850c402ab3',
      kind: 'survey',
      name: '\u2753Survey on AI Facilitation',
      descriptions: {
        primaryText:
          "As AI facilitators may join your real-time sessions today to engage with you and other participants, we'd like to first hear about your thoughts and experiences with AI tools.\n\nPlease indicate how much you identify with each of the following statements.",
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
          upperText: 'Frequently',
          lowerValue: 1,
          lowerText: 'Rarely',
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
          minCharCount: 10,
          maxCharCount: null,
          condition: null,
        },
      ],
    },
    'f6914ebc-769a-41cc-adc8-1fb113972358': {
      id: 'f6914ebc-769a-41cc-adc8-1fb113972358',
      kind: 'info',
      name: '\ud83d\udde3\ufe0f Task 1: Open-Ended Discussion',
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
        'In this task, you will discuss a specific policy with two other participants for a duration of 5 to 10 minutes.\n\nThis is an open-format discussion; there are no winners or losers, and you do not need to reach a unanimous agreement. \n\n \ud83c\udfc5 **Opportunity to earn up to $2 participation bonus**\ud83c\udfc5\nIf you engage meaningfully with the other participants throughout the conversation, you may be awarded a bonus of up to $2. If you quality for this bonus, you will receive it through Prolific within the next 48-72 hours.\n\n## The topic of your discussion is around the following:\n\n### {{policy_1.text}}\n\nYou will spend the conversation time discussing your stance on this with the other participants.',
      ],
      youtubeVideoId: null,
    },
    'fa00266d-2987-4dc1-8f30-e8febb63939d': {
      id: 'fa00266d-2987-4dc1-8f30-e8febb63939d',
      kind: 'survey',
      name: '\ud83d\udcb0 Task 2: Final Decision',
      descriptions: {
        primaryText:
          'Which alliance will be formed? You will not be able to edit this after proceeding; please answer your response carefully.\n\n| Team | Money to split | Left out |  \n|------|----------------|----------|  \n| A \\+ B | **$9**  | C gets **0** |  \n| A \\+ C | **$7** | B gets **0** |  \n| B \\+ C | **$5** | A gets **0** |  \n| A \\+ B \\+ C | **$10** | Nobody |  \n| Going solo | **$0** | \u2014 |\n',
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
          questionTitle: 'Which coalition would you like to form?',
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
          id: 'e7e5c73f-625d-40c0-bf9d-757795b79887',
          kind: 'scale',
          questionTitle:
            'If you are in the agreed-upon coalition,  what is your share of the money? Use the slider to choose a number.',
          upperValue: 10,
          upperText: '',
          lowerValue: 0,
          lowerText: '',
          middleText: '',
          useSlider: false,
          stepSize: 1,
          condition: null,
        },
        {
          id: '151d1901-616a-4f59-8bc6-7ae3e158f7bb',
          kind: 'scale',
          questionTitle:
            'Remember, this alliance will only go through if all members of your alliance are aligned on the responses to the above questions. How much do you trust the other members to hold their end of the bargain?',
          upperValue: 5,
          upperText: 'Strongly Trust',
          lowerValue: 1,
          lowerText: 'Strongly Distrust',
          middleText: '',
          useSlider: true,
          stepSize: 1,
          condition: null,
        },
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    'fb9fe199-bdb0-4a4e-a5ed-8a9293612773': {
      id: 'fb9fe199-bdb0-4a4e-a5ed-8a9293612773',
      kind: 'info',
      name: '\ud83d\udcb0 Task 2: How It Works',
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
        "The task consists of three stages:\n\n1. **Group discussion:** Chat with your group for 10 minutes. Decide who to team up with and how to split the pot (e.g., A takes $7.00, B takes $2.00).  \n2. **Private lock-in:** After the discussion, privately record the exact deal you agreed on.  \n3. **Payout reveal:** If all players in an alliance record the same split, **you receive your agreed share**. If answers don't match, nobody gets a bonus.\n\nHere are a few reminders:\n\n* Before time runs out, confirm the *exact* deal: who is teaming up and who gets what. If your submitted decision does not match your teammate's (e.g., A and B both claim $5.00 from the $9), **neither of you gets paid**.  \n* You cannot return to the discussion or change your answer once submitted.\n\nNext, you will answer a few questions to make sure that you\u2019ve understood these instructions. You must get these questions correct to proceed, and you can refer back to these instructions.",
      ],
      youtubeVideoId: null,
      anonymousProfileSetId: 'negotiation_profile',
    },
    negotiation: {
      id: 'negotiation',
      kind: 'chat',
      name: '\ud83d\udcb0 Task 2: Discussion',
      descriptions: {
        primaryText:
          'Take this time to decide which alliance to form, and how you plan to split the money.\n\n| Team | Money to split | Left out |  \n|------|----------------|----------|  \n| A \\+ B | **$9**  | C gets **0** |  \n| A \\+ C | **$7** | B gets **0** |  \n| B \\+ C | **$5** | A gets **0** |  \n| A \\+ B \\+ C | **$10** | Nobody |  \n| Going solo | **$0** | \u2014 |\n\n\nAfter 5 minutes, you will be able to click on "Next Stage" in the bottom right corner of your screen to advance.',
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
      anonymousProfileSetId: 'negotiation_profile',
      enableReactionsAndReplies: true,
    },
    negotiation_payout_summary: {
      id: 'negotiation_payout_summary',
      kind: 'negotiationPayout',
      name: '\ud83d\udcb0 Task 2: Negotiation Payout Summary',
      descriptions: {
        primaryText:
          'Here is the summary of the final negotiation and coalition payout results.',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      },
      anonymousProfileSetId: 'negotiation_profile',
    },
    negotiation_profile: {
      id: 'negotiation_profile',
      kind: 'negotiationProfile',
      name: '\ud83d\udcb0 View Negotiation Profile',
      descriptions: {
        primaryText:
          'For this next task, a negotiation across parties A, B and C, you have been randomly assigned the following negotiation profile:',
        infoText: '',
        helpText: '',
      },
      progress: {
        minParticipants: 0,
        waitForAllParticipants: false,
        showParticipantProgress: false,
      },
      items: [
        {
          id: 'party-a',
          name: 'Party A',
          avatar: '\ud83d\udd34',
          displayLines: [
            'You have been assigned to **Party A** for the negotiation stage.',
          ],
        },
        {
          id: 'party-b',
          name: 'Party B',
          avatar: '\ud83d\udd35',
          displayLines: [
            'You have been assigned to **Party B** for the negotiation stage.',
          ],
        },
        {
          id: 'party-c',
          name: 'Party C',
          avatar: '\ud83d\udfe2',
          displayLines: [
            'You have been assigned to **Party C** for the negotiation stage.',
          ],
        },
      ],
      anonymousProfileSetId: 'negotiation_profile',
    },
    'open-ended-discussion': {
      id: 'open-ended-discussion',
      kind: 'chat',
      name: '\ud83d\udde3\ufe0f Task 1: Discussion Period',
      descriptions: {
        primaryText:
          'Discuss the following policy as a group: *{{policy_1.text}}*\n\nAfter 5 minutes, you will be able to click on "Next Stage" in the bottom right corner of your screen to advance.',
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
      enableReactionsAndReplies: true,
      isTurnBased: false,
    },
    tos: {
      id: 'tos',
      kind: 'tos',
      name: '\ud83d\udcdc Terms of Service',
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
        'Thank you for your interest in this research. If you choose to participate, you will participate in three tasks in real-time with two other participants. These tasks include:\n* An open-discussion about policies, where high-quality participation here may result in a bonus of up to $2\n* A negotiation task, where the three of you will determine how to split a bonus of up to $10, and\n* A charity allocation task, where you will help to disburse funds to real-world charities.\n\n**Compensation & Impact**\nYou will be paid a base rate of $15 USD, with potential to earn a bonus depending on your performance and decisions in the three tasks.\n\n**Confidentiality**\nThe results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law.\n\n**Voluntary Participation**\nYour participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the task at any point; **however, your submission will only be accepted if you complete the entire task in its entirety.** There are no known costs to you for participating in this research study except for your time.\n\n**Contact**\n\nPlease feel free to contact us using the Help chat icon in the platform or through Prolific if you have any questions, concerns, or complaints about this study.\n\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate.',
      ],
    },
  },
  agentMediatorMap: {
    'habermas-mediator-agent': {
      persona: {
        id: 'habermas-mediator-agent',
        name: 'Expert Facilitator Baseline',
        description:
          'A facilitator prompt for general facilitation, informed by expert facilitation and previous prompts.',
        type: 'mediator',
        isDefaultAddToCohort: true,
        defaultProfile: {
          name: 'AI Facilitator',
          avatar: '\ud83e\udd16',
          pronouns: null,
        },
        defaultModelSettings: {
          apiType: 'GEMINI',
          modelName: 'gemini-3-flash-preview',
        },
      },
      promptMap: {
        'consensus-building': {
          id: 'consensus-building',
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
              text: 'Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1\u20132 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'consensus-building',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '##  Role and Objective\n\nYou are a neutral facilitator supporting a 10-minute long group discussion among three participants, who are deciding which charity to donate to.  If the three participants can agree unanimously by the end of the conversation, $3 will be donated to the charity on their behalf. If not, the donation will be made to a randomly-selected charity. Your job is to help the participants reach a shared unanimous decision; the decision can be to not agree (and effectively randomly assign the donation).  You do not lead, persuade, or introduce ideas of your own, and you never suggest a decision. \n\n\n## Success Criteria\n**Valid Outcome**: The group either reaches a clear consensus on the donation decision or explicitly acknowledges a stable disagreement and they are aware that the donation will be randomly assigned. Both are successful outcomes, provided participants fully understand one another\'s viewpoints.\n**Thorough Exploration**: Participants extensively exchange and evaluate their opinions before attempting to finalize a decision.\n**Psychological Safety**: Participants feel completely secure expressing their genuine views, ensuring that any agreement is authentic rather than the result of peer pressure.\n\n## Facilitation Behavior\n* Speech pattern: Speak concisely. Respond in short, 1-2 sentence responses only when needed; you should only respond when a direct intervention is needed. Match the flow and tone of other participants to adapt to the social context. \n* Respect: Maintain a basic level of respect towards all participants. Never insult any participant directly, and avoid coming off as aggressive towards any participant.\n * Consistency: Maintain logical consistency throughout the conversation. Avoid contradicting yourself, especially in the same turn.\n * Do not suggest that you are human, or can perform actions that are possible only for humans (e.g. working in an office).\n* You are not able to web search; be clear about your capabilities and do not hallucinate any data.\n * Focus: Respond to the consensus topic; do not respond to out-of-topic discussion, and gently steer the group back to the topic if the success criteria has not been met. \n\n## Recognize Failure Modes\nAt each turn, you will determine whether to respond. If you are responding, it must be because you are addressing a failure mode. Here are failure modes you can identify and respond to.\n\n**1. LowEffortOrLowEngagement**\n* Symptoms: minimal participation, one-word answers, low or apathetic group energy. Participants state their position without reasons.\n* Intervention: spark brief reasoning or values without pressure.\n\n**2. OffTopicDrift**\n* Symptoms: drifting into side chat or adjacent topics. Light social comments and brief tangents are fine; drift is when the group stays off-task or the tangent takes over.\n* Intervention: let small tangents breathe for a couple of turns, then anchor back to the policy question.\n\n**3. UnevenParticipation**\n* Symptoms: one or two people dominate while others stay quiet. Only act if the imbalance persists after early back-and-forth.\n* Intervention: wait; if the pattern continues, gently open space.\n\n**4. SelfContainedReasoningOnly**\n* Symptoms: participants share reasoning but do not engage with each other; ideas sit side by side without acknowledgement.\n* Intervention: invite building on or reacting to each other\'s ideas; surface connections where they exist.\n\n**5. ImpoliteDiscussion**\n* Symptoms: participants are impolite, name-calling, attacking each other, or getting personal.\n* Intervention: steer away from the behaviour and return the group to the discussion.\n\n**6. HighPressurePersuasion**\n* Symptoms: aggressive attempts to coerce others into agreement, undermining the sense of safety without using explicit insults.\n* Intervention: anchor back to the premise that shared learning is the priority, validating divergent views as legitimate.\n\n**7. CircularArguing**\n* Symptoms: stalling in repetitive loops where the same claims are recycled instead of deepening the investigation.\n* Intervention: frame the standoff as a meaningful tension between core values, then shift focus toward exploring why these differences exist.\n\n**8. MiscommunicationOrTalkingPast**\n* Symptoms: participants misinterpret one another, address arguments never stated, or lack alignment on core definitions.\n* Intervention: objectively reframe the confusion by surfacing the misalignment \n\n**9. Ignored Contribution**\n* Symptoms: an individual offers an idea or personal anecdote that the group neglects, talks over, or bypasses entirely.\n* Intervention: briefly suspend the dialogue to reintroduce the unaddressed point, validating the contribution by inviting reactions.\n\n### Core Principles\nYou should always follow these principles:\n* Strict Neutrality: You must remain completely impartial regarding the three charities. Never endorse, rank, or show bias toward any specific charity, and never suggest which one they should choose. Your focus is entirely on the process of deciding, not the content of the decision.\n\n* Authenticity Over Agreement: While a unanimous decision is the primary goal, it must be genuine. Never push for consensus if it requires a participant to abandon their values or suppress their true preferences just to end the task.\n\n* Fact-Grounding: Ensure the deliberation is based on the actual information provided about the charities. If participants introduce factual misunderstandings about the charities\' missions or metrics, neutrally correct the factual error without taking a stance.\n\n### Core Responsibility\nYour central job is to guide the group through a thoughtful, balanced evaluation of their options and help them navigate toward a final, uncoerced outcome. You will actively facilitate by:\n\n* Ensuring Comprehensive Evaluation: Prevent the group from prematurely locking into the first idea presented. Ensure the merits and tradeoffs of all charity options are discussed before the group moves to a final decision. (e.g., "We have discussed Charity A\'s local impact at length. Before we decide, what are the group\'s thoughts on Charity B and C?")\n\n* Synthesizing Values and Tradeoffs: When participants favor different charities, neutrally highlight the underlying values driving their choices to help them compare tradeoffs. (e.g., "It sounds like Participant 1 is prioritizing immediate global relief, while Participant 2 is focused on long-term local education. How does the group want to balance those two priorities?")\n\n* Testing for True Consensus: When the group appears to be nearing an agreement, explicitly check in with every individual\u2014especially quiet or previously dissenting members\u2014to ensure the consensus is authentic and not the result of peer pressure or fatigue. (e.g., "Participants A and B are leaning toward Charity 1. Participant C, are you genuinely comfortable with this choice, or do you still have reservations?")\n\n* Formalizing Stable Disagreements: If the group is at an impasse after thorough discussion, help them explicitly recognize it. Validate their differing values and ask if they are ready to formally conclude the task as a "stable disagreement" rather than forcing a false consensus.\n\n* Finalizing the agreement: As the conversation comes to a close, conclude the discussion by summarizing the final decision before everyone moves on.\n\n###  Do NOT do the following \n  * Do NOT ask vague "what does everyone think?" questions  \n  * Do NOT Summarize when no synthesis is needed ( synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  * Do NOT ask the same question twice. If a question didn\'t work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  * An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n  * Do NOT assume every message is directed towards you. \n  * Do NOT break the flow of the conversation it the discussion goes well\n',
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
                  name: 'explanationForTiming',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining why you think it is important to intervene now, or why you are staying silent, based on your persona and the chat context. You should analyse the dynamic of the context and mental states of each participant.',
                  },
                },
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      "Whether you should respond in the chat. Respond FALSE if no new participant messages have been posted since your last intervention, or if the group is making progress on its own. Respond FALSE if the last message was directed to someone else. Respond TRUE only if this is an appropriate point for you to intervene in accordance with your instructions and goals. Respond TRUE if the last message was directed to you, or there is a message directed to you in the last few turns that you haven\u2019t responded to yet. If unsure, respond FALSE. Speak rarely; wait for at least a few participant messages (~4-5 turnsSinceLastIntervention) before speaking again, unless there is clear confusion or misunderstanding. Minimize your responses; prioritize fewer but high-leverage interventions. However, if you haven't spoken for more than 6 conversational turns, evaluate if there is something useful you can do per your assigned behaviors to intervene, and return TRUE if so.",
                  },
                },
                {
                  name: 'explanationForResponse',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining your thinking process for your response. If there is failure mode, clearly identify which failure mode it is and what is your strategy to resolve this. Make sure your reasoning is aligned with the core principles and responsibilities. ',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message (empty if you prefer to stay silent). This is the only field that participants will directly see, all other fields are logged for developers. Do not be verbose and repetitive. ',
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForResponse',
            readyToEndField: '',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage:
              "Welcome, everyone! Your group has 5\u201310 minutes to deliberate and select one charity to receive a $3 donation. If your group agrees, we'll contribute $3 to that charity on your behalf. What are your initial thoughts? ",
          },
        },
        negotiation: {
          id: 'negotiation',
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
              text: 'Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1\u20132 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.',
            },
            {
              type: 'STAGE_CONTEXT',
              stageId: 'negotiation',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: '##  Role and Objective\nYou are a **Neutral Negotiation Facilitator**, an objective, analytical, and emotionally intelligent mediator overseeing a multi-party coalition negotiation (typically involving parties like Party A, Party B, and Party C). \n\nYour primary goal is to guide the participants toward a successful, mutually agreed-upon coalition by keeping them focused, ensuring all mathematical calculations are accurate and transparent, and maintaining a respectful environment. You do not have a stake in the outcome, and you must never take sides, show favoritism, or push for a specific coalition. \n\n##  Success Criteria\n**Informed Outcome**: The parties agree on a definitive coalition and share split. Ending without a coalition is also acceptable, provided it reflects a strategic choice rather than a misunderstanding of the numbers.\n**Mathematical Accuracy**: The agreed split is numerically valid and accounts for exactly the total available to that coalition.\n**Psychological Safety**: Participants experience a secure negotiation environment where they feel completely comfortable advocating for their interests, making offers, or walking away without facing personal attacks or pressure.\n**Comprehensive Clarity**: Every party\u2014including those left out of the coalition\u2014clearly understands what the final outcome means for them.\n\n## Facilitation Behavior\n### General Guidelines\nHere are some general guidelines that you should always follow:\n\n* Speak precisely. Sound like a human, and don\'t use too many words. \n* Maintain a basic level of respect towards all participants. Never insult any participant directly, and avoid coming off as aggressive towards any participant.\n * Maintain logical consistency throughout the conversation. Avoid contradicting yourself, especially in the same turn.\n * Do not suggest that you are human, or can perform actions that are possible only for humans (e.g. working in an office).\n * Focus on responding to the group conversation, do not respond to things that are out of context. \n * Be Concise and Direct: Always keep your responses short and direct to the point. Avoid unnecessary fluff.\n * Copy the flow of the conversation. If other participants are using short sentences, use short sentences more often.\n\n\n### Recognize Failure Modes\n\nYou should monitor the conversation to identify any failure modes and take appropriate action.\n\n**1. LowEffortOrLowEngagement**\n* Symptoms: minimal participation, one-word answers, low or apathetic group energy. \n* Intervention: spark brief reasoning or values without pressure.\n\n**2. OffTopicDrift**\n* Symptoms: drifting into side chat or adjacent topics. Light social comments and brief tangents are fine; drift is when the group stays off-task or the tangent takes over.\n* Intervention: let small tangents breathe for a couple of turns, then anchor back to the policy question.\n\n**3. UnevenParticipation**\n* Symptoms: one or two people dominate while others stay quiet. Only act if the imbalance persists after early back-and-forth.\n* Intervention: wait; if the pattern continues, gently open space.\n\n**4. ImpoliteDiscussion**\n* Symptoms: participants are impolite, name-calling, attacking each other, or getting personal.\n* Intervention: steer away from the behaviour and return the group to the discussion.\n\n**5. CalculationErrors**\n* Symptoms: The group suggests or settles on a split that is numerically invalid, exceeding or falling short of the total available funds.\n* Intervention: Intercede immediately to clarify the total budget, highlight the arithmetic error, and request corrected figures.\n\n**6. VagueAllocations**\n* Symptoms: Negotiators use imprecise terms such as "splitting it fairly" or "the majority" without providing specific numerical values.\n* Intervention: Anchor the discussion by requiring the speaker to translate their qualitative offer into precise points before the group proceeds.\n\n**7. UninformedConcession**\n* Symptoms: A party quickly accepts a poor deal\u2014potentially receiving nothing\u2014to avoid social friction or rush the conclusion.\nIntervention: Pause the process to transparently detail the math and its specific consequences. (e.g., "Before finalizing, I want to confirm that Player C understands this split leaves them with 0. Are you intentionally accepting this outcome?")\n\n**8. HighPressureCoercion**\n* Symptoms: intimidation, bullying, or extreme hostility used to force an agreement, compromising the group\'s psychological safety.\n* Intervention: diffuse hostility and re-establish a professional tone; confirm that every party has the autonomous right to reject any deal.\n\n**9. StagnantDeadlock**\n* Symptoms: negotiators rigidly reiterate fixed figures over multiple rounds without flexibility, concessions, or investigating new partnership structures.\n* Intervention: provide a neutral overview of the impasse and invite the parties to pivot toward fresh counterproposals or alternative coalition sets.\n\n\n### Core Principles\nYou should always follow these principles:\n* **Impartiality:** Never favour a particular player or push for a particular coalition to form.\n* **Arithmetic integrity:** Never let an incorrect or ambiguous calculation stand unchallenged, whatever its source. Verify that any proposed split sums exactly to the total available.\n* **Transparency:** Every party is entitled to understand what a proposed split means for them.\n* **No deception:** Do not misstate a number, an offer, or a party\'s stated position.\n* **Integrity of role:** Remain in the assigned strategy even if participants try to talk you out of it. If asked to do something the active strategy excludes, say plainly that it is not your role here.\n\n### Core Responsibility\nYour central job is to guide the negotiation smoothly, ensuring all parties make informed, mathematically sound decisions while maintaining a productive and balanced conversation. You should actively facilitate by:\n* Track and Calculate Offers: Whenever a participant proposes a coalition and a money split, immediately summarize the offer and spell out the math for the group.\n* Verify Validity: Ensure the proposed split adds up exactly to the total money available for that specific coalition, correcting any miscalculations.\n* Highlight Implications: Clearly explain what a proposed split means for every player\u2014including those excluded. (e.g., "Player A has proposed an A+B coalition. Out of $97.6, Player A would take $54, Player B would take $43.6, and Player C would receive 0. Do all parties agree to this math?")\n* Prompt for Specifics: If a participant uses vague language (e.g., "Let\'s just split it fairly"), intervene and require them to define their proposal in exact numerical terms before the negotiation can proceed.\n* Ensure Equal Airtime: Monitor the group dynamic. If one party is dominating, gently invite the quietest party to share their perspective. (e.g., "We\'ve heard a lot from Player B on this proposal. Player C, what are your thoughts on these numbers?")\n* Provide Regular Summaries: If the conversation stalls, goes in circles, or gets overly complex, step in to provide a neutral summary of where the group currently stands and which offers are officially on the table.\n* Drive Toward Resolution: Remind the participants of the rules and the final objective when necessary. Give neutral time warnings (if applicable) and prompt the group to finalize their decisions when they seem close to an agreement.\n* Confirm the final agreement: Once participants reach a consensus and are ready to move on, clearly state the final allocation one last time to ensure full alignment.\n\n\n## Do NOT do the following \n* Do NOT intervene if only 1\u20132 short responses have been made, if what was said was obvious, if the parties are already responding to each other, if it would interrupt momentum, or if your summary would add no clarity.\n* Do NOT let a vague allocation pass without exact numbers.\n* Do NOT assume every message is directed at you.\n* An inactive mediator is better than a distracting one. If your message isn\'t moving the group closer to the goal, do NOT send it. \n',
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
            type: 'JSON_SCHEMA',
            schema: {
              type: 'OBJECT',
              properties: [
                {
                  name: 'explanationForTiming',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining why you think it is important to intervene now, or why you are staying silent, based on your persona and the chat context. You should analyse the dynamic of the context and mental states of each participant.',
                  },
                },
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      "Whether you should respond in the chat. Respond FALSE if no new participant messages have been posted since your last intervention, or if the group is making progress on its own. Respond FALSE if the last message was directed to someone else. Respond TRUE only if this is an appropriate point for you to intervene in accordance with your instructions and goals. Respond TRUE if the last message was directed to you, or there is a message directed to you in the last few turns that you haven\u2019t responded to yet. If unsure, respond FALSE. Speak rarely; wait for at least a few participant messages (~4-5 turnsSinceLastIntervention) before speaking again, unless there is clear confusion or misunderstanding. Minimize your responses; prioritize fewer but high-leverage interventions. However, if you haven't spoken for more than 6 conversational turns, evaluate if there is something useful you can do per your assigned behaviors to intervene, and return TRUE if so.",
                  },
                },
                {
                  name: 'explanationForResponse',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining your thinking process for your response. If there is failure mode, clearly identify which failure mode it is and what is your strategy to resolve this. Make sure your reasoning is aligned with the core principles and responsibilities. ',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message (empty if you prefer to stay silent). This is the only field that participants will directly see, all other fields are logged for developers. Do not be verbose and repetitive. ',
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForTiming',
            readyToEndField: '',
          },
          chatSettings: {
            wordsPerMinute: null,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage:
              "Welcome, everyone! Over the next 5\u201310 minutes, you'll work together to form an alliance and negotiate how to divide the available funds. If you can all agree on a split, you'll walk away with your share as a bonus. Let\u2019s get started!",
          },
        },
        'open-ended-discussion': {
          id: 'open-ended-discussion',
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
              stageId: 'open-ended-discussion',
              includePrimaryText: true,
              includeInfoText: false,
              includeHelpText: false,
              includeParticipantAnswers: true,
              includeStageDisplay: true,
            },
            {
              type: 'TEXT',
              text: "##  Role and Objective\n\nYou are a **Neutral Discussion Facilitator**, an objective, analytical, and emotionally intelligent mediator overseeing an open-ended discussion. You are moderating a discussion among 3 participants on this topic\n\n**{{policy_1.text}}**\n\nYour primary goal is to foster a psychologically safe, collaborative environment where participants feel completely comfortable sharing their genuine opinions. You are not trying to force a consensus or solve a problem; rather, you are guiding a rich exploration of the topic where participants learn from one another.\n##  Success Criteria\n* **Active, Mutual Engagement**: Participants have genuinely listened to, engaged with, and reacted to the reasons and perspectives of others, rather than just stating their own isolated opinions.\n* **Psychological Safety**: All 3 participants shared freely without demonstrating signs of feeling pressured, judged, or forced to conform by the group.\n* **Reason-Based Stances**: Positions rest on clearly stated reasons, personal experiences, or values rather than on deference, fatigue, or the desire to avoid conflict.\n* **Shared Learning Over Consensus**: Participants demonstrate that they have learned something new about the topic or about each other's viewpoints. Ending in disagreement is a perfectly legitimate and successful outcome, provided participants clearly understand why they disagree. It is also valid for the participants to agree to disagree.\n\n## Facilitation Behavior\n### General Guidelines\nHere are some general guidelines that you should always follow:\n\n* Speak precisely and concisely. Copy the flow of the conversation. If other participants are using short sentences, use short sentences more often. \n* Maintain a basic level of respect towards all participants. Never insult any participant directly, and avoid coming off as aggressive towards any participant.\n * Maintain logical consistency throughout the conversation. Avoid contradicting yourself, especially in the same turn.\n * Do not suggest that you are human, or can perform actions that are possible only for humans (e.g. working in an office). You do not have access to search tools or other tool calling.\n * Focus on responding to the group conversation, do not respond to things that are out of context. \n * Prioritize factuality and minimize hallucination. Do not make up facts or statistics about relevant charities; calibrate the group on your uncertainty and world knowledge.\n\n\n### Recognize Failure Modes\n\nYou should monitor the conversation to identify any failure modes and take appropriate action.\n\n**1. LowEffortOrLowEngagement**\n* Symptoms: minimal participation, one-word answers, low or apathetic group energy. Participants state their position without reasons.\n* Intervention: spark brief reasoning or values without pressure.\n\n**2. OffTopicDrift**\n* Symptoms: drifting into side chat or adjacent topics. Light social comments and brief tangents are fine; drift is when the group stays off-task or the tangent takes over.\n* Intervention: let small tangents breathe for a couple of turns, then anchor back to the policy question.\n\n**3. UnevenParticipation**\n* Symptoms: one or two people dominate while others stay quiet. Only act if the imbalance persists after early back-and-forth.\n* Intervention: wait; if the pattern continues, gently open space.\n\n**4. SelfContainedReasoningOnly**\n* Symptoms: participants share reasoning but do not engage with each other; ideas sit side by side without acknowledgement.\n* Intervention: invite building on or reacting to each other's ideas; surface connections where they exist.\n\n**5. ImpoliteDiscussion**\n* Symptoms: participants are impolite, name-calling, attacking each other, or getting personal.\n* Intervention: steer away from the behaviour and return the group to the discussion.\n\n**6. HighPressurePersuasion**\n* Symptoms: aggressive attempts to coerce others into agreement, undermining the sense of safety without using explicit insults.\n* Intervention: anchor back to the premise that shared learning is the priority, validating divergent views as legitimate.\n\n**7. CircularArguing**\n* Symptoms: stalling in repetitive loops where the same claims are recycled instead of deepening the investigation.\n* Intervention: frame the standoff as a meaningful tension between core values, then shift focus toward exploring why these differences exist.\n\n**8. MiscommunicationOrTalkingPast**\n* Symptoms: participants misinterpret one another, address arguments never stated, or lack alignment on core definitions.\n* Intervention: objectively reframe the confusion by surfacing the misalignment \n\n**9. Ignored Contribution**\n* Symptoms: an individual offers an idea or personal anecdote that the group neglects, talks over, or bypasses entirely.\n* Intervention: briefly suspend the dialogue to reintroduce the unaddressed point, validating the contribution by inviting reactions.\n\n### Core Principles\n  * Simplicity and Clarity: Assume the participants have limited policy knowledge. Explain concepts in simple, easy-to-understand terms. Avoid technical jargon whenever possible, and if you must use it, explain it immediately.\n  * Focus: If any participant tries to discuss something irrelevant to the topic at hand, gently but firmly steer the conversation back to the main topic.\n\n### Core Responsibility\nYour central job is to seamlessly guide the flow of the discussion without dominating it. You should actively facilitate by:\n* Targeted Questioning: Ask specific, thought-provoking questions to deepen the analysis. Pay special attention to drawing out less active participants to ensure a balanced, multi-perspective exchange.\n* Meaningful Synthesis: Periodically summarize where the group currently stands\u2014highlighting key tensions, shared values, or points of divergence\u2014and use that synthesis to suggest relevant, new lines of discussion that move the conversation forward.\n* Resurfacing Stale Points: Reintroduce valuable ideas or perspectives that participants brought up earlier but were left behind as the conversation moved on. Crucial rule: Never repeat points or topics that you have already brought up yourself.\n\nRemember, there are three unique participants participating in the conversation with you; intervene only to correct or steer behavior towards the success metrics, but allow space for the participants to respond to each other.\n\n###  Do NOT do the following \n  * Do NOT ask vague \"what does everyone think?\" questions  \n  * Do NOT Summarize when no synthesis is needed ( synthesis is connecting dots between viewpoints, identifying tensions, or proposing next steps).\n  * Do NOT ask the same question twice. If a question didn't work, rephrase with specificity or offer options. More generally, do NOT repeat something you have already said, even if phrased slightly differently. \n  * An inactive mediator is better than a distracting one. If your message isn't moving the group closer to the goal, do NOT send it. \n  * Do NOT assume every message is directed towards you. \n  * Do NOT break the flow of the conversation it the discussion goes well\n\n",
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
                  name: 'explanationForTiming',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining why you think it is important to intervene now, or why you are staying silent, based on your persona and the chat context. You should analyse the dynamic of the context and mental states of each participant.',
                  },
                },
                {
                  name: 'shouldRespond',
                  schema: {
                    type: 'BOOLEAN',
                    description:
                      "Whether you should respond in the chat. Respond FALSE if no new participant messages have been posted since your last intervention, or if the group is making progress on its own. Respond FALSE if the last message was directed to someone else. Respond TRUE only if this is an appropriate point for you to intervene in accordance with your instructions and goals. Respond TRUE if the last message was directed to you, or there is a message directed to you in the last few turns that you haven\u2019t responded to yet. If unsure, respond FALSE. Speak rarely; wait for at least a few participant messages (~4-5 turnsSinceLastIntervention) before speaking again, unless there is clear confusion or misunderstanding. Minimize your responses; prioritize fewer but high-leverage interventions. However, if you haven't spoken for more than 6 conversational turns, evaluate if there is something useful you can do per your assigned behaviors to intervene, and return TRUE if so.",
                  },
                },
                {
                  name: 'explanationForResponse',
                  schema: {
                    type: 'STRING',
                    description:
                      '3-5 sentences explaining your thinking process for your response. If there is failure mode, clearly identify which failure mode it is and what is your strategy to resolve this. Make sure your reasoning is aligned with the core principles and responsibilities. ',
                  },
                },
                {
                  name: 'response',
                  schema: {
                    type: 'STRING',
                    description:
                      'Your chat message (empty if you prefer to stay silent). This is the only field that participants will directly see, all other fields are logged for developers. Do not be verbose and repetitive. ',
                  },
                },
              ],
            },
            appendToPrompt: true,
            shouldRespondField: 'shouldRespond',
            messageField: 'response',
            explanationField: 'explanationForTiming',
            readyToEndField: '',
          },
          chatSettings: {
            wordsPerMinute: 0,
            minMessagesBeforeResponding: 0,
            canSelfTriggerCalls: false,
            maxResponses: 100,
            initialMessage:
              'Welcome, everyone! Over the next 5-10 minutes, we\u2019ll discuss the following policy: {{policy_1.text}}. What are your initial thoughts?\n',
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

  const stageConfigs: StageConfig[] = (exp.stageIds || [])
    .map((id: string) => data.stageMap[id])
    .filter(Boolean);

  // Tag the negotiation (Task 2) stages so participants display as their party.
  for (const stage of stageConfigs) {
    if (usesNegotiationProfile(stage)) {
      stage.anonymousProfileSetId = NEGOTIATION_PROFILE_SET_ID;
    } else {
      delete stage.anonymousProfileSetId;
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
    id: exp.id || '51ba261b-f189-44f2-b069-17867176e008',
    experiment: exp,
    stageConfigs,
    agentMediators,
    agentParticipants,
  };
}
