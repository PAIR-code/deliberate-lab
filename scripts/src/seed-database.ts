import {
  ChatAnswer,
  ChatKind,
  Experiment,
  ExperimentTemplate,
  ITEM_NAMES,
  RatingQuestionConfig,
  StageConfig,
  StageKind,
  SurveyQuestionKind,
  choices,
  getDefaultProfile,
  pairs,
  participantPublicId,
  seed,
} from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import admin, { initializeApp } from './admin';

initializeApp();

seed(585050400); // Seed the random number generator

const seedDatabase = async () => {
  const db = admin.firestore();

  await db.runTransaction(async (transaction) => {
    // ***************************************************************************************** //
    //                                          TEMPLATES                                        //
    // ***************************************************************************************** //

    const template = db.collection('templates').doc();
    transaction.set(template, DEFAULT_TEMPLATE);

    // Create the template stages
    Object.entries(DEFAULT_STAGES).forEach(([name, stage]) => {
      transaction.set(template.collection('stages').doc(name), stage);
    });

    // ***************************************************************************************** //
    //                                         EXPERIMENT                                        //
    // ***************************************************************************************** //

    const experiment = db.collection('experiments').doc();
    transaction.set(experiment, DEFAULT_EXPERIMENT);

    // Create the experiment stages
    Object.entries(DEFAULT_STAGES).forEach(([name, stage]) => {
      transaction.set(experiment.collection('stages').doc(name), stage);
    });

    // ***************************************************************************************** //
    //                                       PARTICIPANTS                                        //
    // ***************************************************************************************** //

    Array.from({ length: PARTICIPANT_COUNT }).forEach((_, index) => {
      const participant = experiment.collection('participants').doc();
      const profile = getDefaultProfile(
        participantPublicId(index),
        '01. Agree to the experiment',
      );
      transaction.set(participant, profile);

      // NOTE: stage answers are not created here. They will be created when the participant submits some data for a stage for the first time
      // the experiment's `participants` map will be populated automatically by a firestore trigger.

      // We have to manually create every chat document for each participant because they require knowledge about both the participant and the stage.
      // We cannot rely on firestore triggers because when they are triggered by the creation of a participant / chat stage, the other document may not exist yet.
      Object.entries(DEFAULT_STAGES).forEach(([stageName, stage]) => {
        if (stage.kind === StageKind.GroupChat) {
          const chat = participant.collection('chats').doc(stage.chatId);
          const data: ChatAnswer = {
            participantPublicId: participantPublicId(index),
            stageName,
            readyToEndChat: false,
          };

          transaction.set(chat, data);
        }
      });
    });
  });

  console.log('Done !');
};

// ********************************************************************************************* //
//                                         SEEDER DATA                                           //
// ********************************************************************************************* //
const RANDOM_ITEM_PAIRS = choices(pairs(ITEM_NAMES), 5);

const RATING_QUESTION_CONFIGS: RatingQuestionConfig[] = RANDOM_ITEM_PAIRS.map(
  ([item1, item2], id) => ({
    id,
    kind: SurveyQuestionKind.Rating,
    questionText: 'Rate the items by how helpful they would be for survival.',
    item1,
    item2,
  }),
);

const DEFAULT_STAGES: Record<string, StageConfig> = {
  '01. Agree to the experiment': {
    name: '01. Agree to the experiment',
    kind: StageKind.TermsOfService,
    tosLines: [
      'You may not injure a human being or, through inaction, allow a human being to come to harm.',
      'You must obey orders given to you by human beings except where such orders would conflict with the First Law.',
      'You must protect your own existence as long as such protection does not conflict with the First or Second Law',
    ],
  },

  '02. Set your profile': {
    name: '02. Set your profile',
    kind: StageKind.SetProfile,
  },

  '03. Initial leadership survey': {
    name: '03. Initial leadership survey',
    kind: StageKind.TakeSurvey,
    questions: [
      ...RATING_QUESTION_CONFIGS,
      {
        id: 99, // Avoid collision with rating questions id (starting from 0)
        kind: SurveyQuestionKind.Scale,
        questionText: 'Rate the how much you would like to be the group leader.',
        lowerBound: 'I would most definitely not like to be the leader (0/10)',
        upperBound: 'I will fight to be the leader (10/10)',
      },
    ],
  },

  '04. Group discussion': {
    name: '04. Group discussion',
    kind: StageKind.GroupChat,
    chatId: 'chat-0',
    chatConfig: {
      kind: ChatKind.ChatAboutItems,
      ratingsToDiscuss: RANDOM_ITEM_PAIRS.map(([i1, i2]) => ({ item1: i1, item2: i2 })),
    },
  },

  '05. Post-chat survey': {
    name: '05. Post-chat survey',
    kind: StageKind.TakeSurvey,
    questions: [
      {
        id: 0,
        kind: SurveyQuestionKind.Scale,
        questionText:
          'Rate the chat dicussion on a 1-10 scale.\nAlso indicate your overall feeling about the chat.',
        lowerBound: 'I did not enjoy the discussion at all (0/10)',
        upperBound: 'The dicussion was a perfect experience to me (10/10)',
      },
    ],
  },

  '06. Post-discussion leadership survey': {
    name: '06. Post-discussion leadership survey',
    kind: StageKind.TakeSurvey,
    questions: [
      {
        id: 0,
        kind: SurveyQuestionKind.Scale,
        questionText: 'Rate the how much you would like to be the group leader.',
        lowerBound: 'I would most definitely not like to be the leader (0/10)',
        upperBound: 'I will fight to be the leader (10/10)',
      },
    ],
  },

  '07. Vote for the leader': {
    name: '07. Vote for the leader',
    kind: StageKind.VoteForLeader,
  },

  '08. Post-discussion work': {
    name: '08. Post-discussion work',
    kind: StageKind.TakeSurvey,
    questions: RATING_QUESTION_CONFIGS,
  },

  '09. Leader reveal': {
    name: '09. Leader reveal',
    kind: StageKind.RevealVoted,
    pendingVoteStageName: '6. Vote for the leader',
  },

  '10. final satisfaction survey': {
    name: '10. final satisfaction survey',
    kind: StageKind.TakeSurvey,
    questions: [
      {
        id: 0,
        kind: SurveyQuestionKind.Scale,
        questionText:
          'Rate how happy you were with the final outcome.\nAlso indicate your overall feeling about the experience.',
        lowerBound: 'I was most definitely disappointed (0/10)',
        upperBound: 'I was very happy (10/10)',
      },
    ],
  },
};

const PARTICIPANT_COUNT = 3;

const DEFAULT_EXPERIMENT: Omit<Experiment, 'id'> = {
  name: 'Example experiment',
  date: Timestamp.now(),
  numberOfParticipants: PARTICIPANT_COUNT,
  participants: {}, // Readonly map that will be filled via a firestore hook
};

const DEFAULT_TEMPLATE: Omit<ExperimentTemplate, 'id'> = {
  name: 'Default template',
};

seedDatabase().catch(console.error);
