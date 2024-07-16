/** Constants used in the Lost at Sea game */

import {
  QuestionConfig,
  SurveyQuestionKind,
} from '@llm-mediation-experiments/utils';

export const LAS_ID = 'lostAtSea';
export const LAS_DESCRIPTION =
  "An implementation of the Lost at Sea task (Born 2022) with pairwise elements.";

export const LAS_INTRO_DESCRIPTION = `This experiment should take an estimated X minutes.`;
export const LAS_INTRO_INFO_LINES = [
  "You will receive a fixed fee of $x for your participation. The experiment also gives you the opportunity to earn a $x bonus, based on your decisions. We will explain precisely how your bonus is determined later.",
  "At the end of the experiment, you will be redirected to a waiting page. This waiting time is part of the experiment and has been factored into your payment. **You will not be approved for the payout if you do not remain on this waiting page for the full requested duration**.",
  "During this waiting time, you may be invited to continue the experiment by completing two additional parts, Part 2 and Part 3. These parts will be played in *groups of four*, and should take an estimated additional  x minutes. In these parts, you will have the opportunity to earn a $x bonus, based on your decisions and the decisions of other participants. One of these parts will be randomly selected to determine your bonus. Additionally, you will receive a fixed fee of $x for completing Parts 2 and 3.",
  "To sum up:\n\n* You’ll complete a first part *individually*, and then wait to see if you are selected to take part in the next part of the experiment.\n* You need to wait the full amount of time to get your payoff for Part 1, even though you are not selected or choose to leave the experiment.\n* If you receive an invitation, you can then start the rest of the experiment, that is played in *groups of 4*",
  "Please click “Next stage” to proceed."
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
