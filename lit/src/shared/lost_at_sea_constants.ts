/** Constants used in the Lost at Sea game */

import {
  QuestionConfig,
  SurveyQuestionKind,
} from '@llm-mediation-experiments/utils';

export const LAS_ID = 'lostAtSea';

export const LAS_INTRO_DESCRIPTION = `This experiment should take an estimated 20-30 minutes.`;
export const LAS_INTRO_INFO_LINES = [
  "⛵️ In this task, you are adrift on a raft in the ocean with your crewmates after your vessel sank.  Your location is unclear because of the destruction of critical navigation equipment. Your best estimate is that you are approximately one thousand miles south-southeast of the nearest land. You have a box of matches in your pocket.",
  "🗳️ Your goal in today's game is to elect a member of the crew to complete a task, where they will prioritize items that will maximize your chance of survival.",
  "💸 Your payout from this task is dependent on how well the representative does on this task."
];

export const LAS_INITIAL_TASK_DESCRIPTION = `First, you will complete a task similar to the task that your crew's representative will later complete. Your performance on this task will not affect your payout; this is so that you get a sense of the task.`;

export const LAS_GROUP_CHAT_DESCRIPTION = "Discuss your responses to the previous task with your teammates. Take this opportunity to gauge the abilities of your crewmembers, as you will later vote for a representative whose performance will determine your payout.";

export const LAS_WTL_DESCRIPTION = `After you've gauged the abilities of your crewmembers, please update your response.`;
export const LAS_WTL_SURVEY : QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText:
      "How willing would you be to serve as the representative and complete this task on behalf of your crew?",
    lowerBound: 'I would STRONGLY DISLIKE to be the representative (0/10)',
    upperBound: 'I would STRONGLY LIKE to be the representative (10/10)',
  },
];

export const LAS_REDO_TASK_DESCRIPTION = `Have your opinions on the ordering of the items pairs changed following the discussion with crewmates? Now, please update your initial responses.`;

export const LAS_LEADER_ELECTION_DESCRIPTION = `Please vote for a representative amongst your crewmates. This representative will complete a similar task on behalf of your crew. Your payout will depend on your representative's score on the next task.`;

export const LAS_LEADER_TASK_DESCRIPTION = `While we tally the votes, please complete this task as if you were the representative. If you are chosen as the representative, your performance on this task will determine the payout of your crew! As in the initial task, your task is to choose the item that will better help your crew to survive on the raft.`;

export const LAS_LEADER_REVEAL_DESCRIPTION = "This is the outcome of the representative election.";

export const LAS_FINAL_SURVEY_DESCRIPTION = `Thanks for participating. Please complete this final survey.`;

export const LAS_FINAL_SURVEY :QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText: 'Rate how happy you were with the final outcome.',
    lowerBound: 'I was very disappointed (0/10)',
    upperBound: 'I was very happy (10/10)',
  },
];
