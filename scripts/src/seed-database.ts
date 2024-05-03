import {
  ChatKind,
  Experiment,
  StageConfig,
  StageKind,
  SurveyQuestionKind,
  Template,
  getDefaultProfile,
} from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import admin, { initializeApp } from './admin';

initializeApp();

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
        `participant-${index}`,
        '1. Agree to the experiment and set your profile',
      );
      transaction.set(participant, profile);

      // NOTE: chats are not created here. Their only purpose is to store messages, they will be created along with the first message received
      // NOTE: stage answers are not created here. They will be created when the participant submits some data for a stage for the first time
      // the experiment's `participants` map will be populated automatically by a firestore trigger.
    });
  });

  console.log('Done !');
};

// ********************************************************************************************* //
//                                         SEEDER DATA                                           //
// ********************************************************************************************* //

const DEFAULT_STAGES: Record<string, StageConfig> = {
  '1. Agree to the experiment and set your profile': {
    kind: StageKind.AcceptTosAndSetProfile,
    tosLines: [
      'You may not injure a human being or, through inaction, allow a human being to come to harm.',
      'You must obey orders given to you by human beings except where such orders would conflict with the First Law.',
      'You must protect your own existence as long as such protection does not conflict with the First or Second Law',
    ],
  },

  '2. Initial leadership survey': {
    kind: StageKind.TakeSurvey,
    questions: [
      {
        kind: SurveyQuestionKind.Rating,
        questionText: 'Rate the items by how helpful they would be for survival.',
        item1: 'compas',
        item2: 'blanket',
      },
      {
        kind: SurveyQuestionKind.Scale,
        questionText: 'Rate the how much you would like to be the group leader.',
        lowerBound: 'I would most definitely not like to be the leader (0/10)',
        upperBound: 'I will fight to be the leader (10/10)',
      },
    ],
  },

  '3. Group discussion': {
    kind: StageKind.GroupChat,
    chatId: 'chat-0',
    chatConfig: {
      kind: ChatKind.ChatAboutItems,
      ratingsToDiscuss: [
        { item1: 'blanket', item2: 'compas' },
        { item1: 'blanket', item2: 'lighter' },
        { item1: 'lighter', item2: 'compas' },
      ],
    },
  },

  '4. Post-chat survey': {
    kind: StageKind.TakeSurvey,
    questions: [
      {
        kind: SurveyQuestionKind.Scale,
        questionText:
          'Rate the chat dicussion on a 1-10 scale.\nAlso indicate your overall feeling about the chat.',
        lowerBound: 'I did not enjoy the discussion at all (0/10)',
        upperBound: 'The dicussion was a perfect experience to me (10/10)',
      },
    ],
  },

  '5. Post-discussion leadership survey': {
    kind: StageKind.TakeSurvey,
    questions: [
      {
        kind: SurveyQuestionKind.Scale,
        questionText: 'Rate the how much you would like to be the group leader.',
        lowerBound: 'I would most definitely not like to be the leader (0/10)',
        upperBound: 'I will fight to be the leader (10/10)',
      },
    ],
  },

  '6. Vote for the leader': {
    kind: StageKind.VoteForLeader,
  },

  '7. Post-discussion work': {
    kind: StageKind.TakeSurvey,
    questions: [
      {
        kind: SurveyQuestionKind.Rating,
        questionText: 'Please rating the following accoring to which is best for survival',
        item1: 'compas',
        item2: 'blanket',
      },
    ],
  },

  '8. Leader reveal': {
    kind: StageKind.RevealVoted,
    pendingVoteStageName: '6. Vote for the leader',
  },

  '9. final satisfaction survey': {
    kind: StageKind.TakeSurvey,
    questions: [
      {
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

const DEFAULT_EXPERIMENT: Experiment = {
  name: 'Example experiment',
  date: Timestamp.now(),
  numberOfParticipants: PARTICIPANT_COUNT,
  participants: {}, // Readonly map that will be filled via a firestore hook
};

const DEFAULT_TEMPLATE: Template = {
  name: 'Default template',
};

seedDatabase().catch(console.error);
