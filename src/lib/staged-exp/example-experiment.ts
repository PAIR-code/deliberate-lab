/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { v4 as uuidv4 } from 'uuid';
import {
  uniqueNamesGenerator,
  Config as UniqueNamesGenConfig,
  starWars,
} from 'unique-names-generator';
import {
  Experiment,
  ExpStage,
  ExpStageSurvey,
  ExpStageVotes,
  ExpStageChatAboutItems,
  //ExpStageItemRatings,
  UserData,
  ExpStageTosAndUserProfile,
  ExpStageVoteReveal,
  RatingQuestion,
  ScaleQuestion,
  SurveyQuestionKind,
  StageKinds,
} from './data-model';

import * as items from './items';
import { uniqueId } from 'underscore';

const fakeNameGenConfig: UniqueNamesGenConfig = {
  dictionaries: [starWars],
};

// TODO: not sure this does anything for us...
export enum ExpStageNames {
  '1. Agree to the experiment and set your profile' = '1. Agree to the experiment and set your profile',
  '2. Initial leadership survey' = '2. Initial leadership survey',
  '3. Group discussion' = '3. Group discussion',
  '4. Post-chat survey' = '4. Post-chat survey',
  '5. Post-discussion leadership survey' = '5. Post-discussion leadership survey',
  '6. Vote for the leader' = '6. Vote for the leader',
  '7. Post-discussion work' = '7. Post-discussion work',
  '8. Leader reveal' = '8. Leader reveal',
  '9. final satisfaction survey' = '9. final satisfaction survey',
}

// -------------------------------------------------------------------------------------
//  Initial Experiment Setup
// -------------------------------------------------------------------------------------

function acceptTosAndSetProfile(): ExpStageTosAndUserProfile {
  return {
    kind: StageKinds.acceptTosAndSetProfile,
    name: ExpStageNames['1. Agree to the experiment and set your profile'],
    config: {
      pronouns: '',
      avatarUrl: '',
      name: '',
      tosLines: [],
      acceptedTosTimestamp: null,
    },
  };
}

// function initialWork(): ExpStageItemRatings {
//   return {
//     kind: stageKinds.STAGE_KIND_RANKED_ITEMS,
//     name: '2. Initial work',
//     complete: false,
//     config: {
//       ratings: [
//         { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
//         { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
//       ],
//     },
//     // userAcceptance: Date,
//   };
// }
const initialItemRatingsQuestion: RatingQuestion = {
  kind: SurveyQuestionKind.RATING,
  id: uniqueId(),
  questionText: 'Rate the items by how helpful they would be for survival.',
  rating: { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
  // ratings: [
  //   { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
  //   { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
  // ],
};

const initialWantToLeadQuestion: ScaleQuestion = {
  kind: SurveyQuestionKind.SCALE,
  id: uniqueId(),
  questionText: `Rate the how much you would like to be the group leader.`,
  lowerBound: 'I would most definitely not like to be the leader (0/10)',
  upperBound: 'I will fight to be the leader (10/10)',
  score: null,
};
function initialWantToLeadSurvey(): ExpStageSurvey {
  return {
    kind: StageKinds.takeSurvey,
    name: ExpStageNames['2. Initial leadership survey'],
    config: {
      questions: [initialItemRatingsQuestion, initialWantToLeadQuestion],
    },
  };
}

function groupChat(): ExpStageChatAboutItems {
  return {
    kind: StageKinds.groupChat,
    name: ExpStageNames['3. Group discussion'],
    config: {
      ratingsToDiscuss: [],
      messages: [],
    },
  };
}

const chatDiscussionQuestion: ScaleQuestion = {
  kind: SurveyQuestionKind.SCALE,
  id: uniqueId(),
  questionText: `Rate the chat dicussion on a 1-10 scale.
Also indicate your overall feeling about the chat.`,
  lowerBound: 'I did not enjoy the discussion at all (0/10)',
  upperBound: 'The dicussion was a perfect experience to me (10/10)',
  score: null,
};

function chatDiscussionSurvey(): ExpStageSurvey {
  return {
    kind: StageKinds.takeSurvey,
    name: ExpStageNames['4. Post-chat survey'],
    config: {
      questions: [chatDiscussionQuestion],
    },
  };
}

const postChatWantToLeadQuestion: ScaleQuestion = {
  kind: SurveyQuestionKind.SCALE,
  id: uniqueId(),
  questionText: `Rate the how much you would like to be the group leader.`,
  lowerBound: 'I would most definitely not like to be the leader (0/10)',
  upperBound: 'I will fight to be the leader (10/10)',
  score: null,
};

function postChatWantToLeadSurvey(): ExpStageSurvey {
  return {
    kind: StageKinds.takeSurvey,
    name: ExpStageNames['5. Post-discussion leadership survey'],
    config: {
      questions: [postChatWantToLeadQuestion],
    },
  };
}

function leaderVoting(): ExpStageVotes {
  return {
    kind: StageKinds.voteForLeader,
    name: ExpStageNames['6. Vote for the leader'],
    config: {},
    // userAcceptance: Date,
  };
}

const finalItemRatingsQuestion: RatingQuestion = {
  kind: SurveyQuestionKind.RATING,
  id: uniqueId(),
  questionText: 'Please rating the following accoring to which is best for survival',
  rating: { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
  // ratings: [
  //   { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
  //   { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
  // ],
};

function postChatWork(): ExpStageSurvey {
  return {
    kind: StageKinds.takeSurvey,
    name: '7. Post-discussion work',
    config: {
      questions: [finalItemRatingsQuestion],
    },
    // userAcceptance: Date,
  };
}

function leaderReveal(): ExpStageVoteReveal {
  return {
    kind: StageKinds.revealVoted,
    name: ExpStageNames['8. Leader reveal'],
    config: {
      pendingVoteStageName: ExpStageNames['6. Vote for the leader'],
      revealTimestamp: null,
    },
  };
}

const finalSatisfactionQuestion: ScaleQuestion = {
  kind: SurveyQuestionKind.SCALE,
  id: uniqueId(),
  questionText: `Rate how happy you were with the final outcome.
Also indicate your overall feeling about the experience.`,
  lowerBound: 'I was most definitely disappointed (0/10)',
  upperBound: 'I was very happy (10/10)',
  score: null,
};

function finalSatisfactionSurvey(): ExpStageSurvey {
  return {
    kind: StageKinds.takeSurvey,
    name: '9. final satisfaction survey',
    config: {
      questions: [finalSatisfactionQuestion],
    },
  };
}

// Example data to bootstrap us...
export function initUserData(stages: ExpStage[]): UserData {
  const stageMap: { [stageName: string]: ExpStage } = {};
  stages.forEach((s) => {
    stageMap[s.name] = s;
  });
  const futureStageNames = stages.map((s) => s.name);
  const currentStageName = futureStageNames.shift();
  if (!currentStageName) {
    throw new Error('Cannot create a user with no experimental stages to do');
  }
  const workingOnStageName = currentStageName;

  const userId = `uid:${uuidv4()}`;

  return {
    accessCode: `access-code:${uuidv4()}`,
    userId,
    profile: {
      name: uniqueNamesGenerator(fakeNameGenConfig), // `fakename:${uuidv4()}`,
      pronouns: '',
      avatarUrl: '',
    },
    stageMap,
    workingOnStageName,
    completedStageNames: [] as string[],
    futureStageNames,
  };
}

export function makeStages() {
  return [
    acceptTosAndSetProfile(),
    //initialWork(),
    initialWantToLeadSurvey(),
    groupChat(),
    chatDiscussionSurvey(),
    postChatWantToLeadSurvey(),
    leaderVoting(),
    postChatWork(),
    leaderReveal(),
    finalSatisfactionSurvey(),
  ];
}

export function initParticipants(
  count: number,
  stages: ExpStage[],
): { [userId: string]: UserData } {
  const participants: { [userId: string]: UserData } = {};
  for (let i = 0; i < count; i++) {
    const p = initUserData(stages);
    participants[p.userId] = p;
  }
  return participants;
}

export function initialExperimentSetup(
  name: string,
  participantCount: number,
  stages: ExpStage[],
): Experiment {
  const participants = initParticipants(participantCount, stages);

  const experiment: Experiment = {
    name,
    date: new Date(),
    numberOfParticipants: Object.keys(participants).length,
    participants,
  };

  return experiment;
}
