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

export const LAS_INITIAL_TASK_INTRO_INFO_LINES = [
  "# Imagine the following scenario:",
  "You have chartered a yacht with three friends for a holiday trip across the Atlantic Ocean. None of you have sailing experience, so you hired an experienced skipper and a two-person crew. In the middle of the Atlantic a fierce fire breaks out in the ship's galley. The skipper and crew have been lost whilst trying to fight the blaze. Much of the yacht is destroyed and is slowly sinking. Vital navigational and radio equipment are damaged, and your location is unclear. Your best estimate is that you are many hundreds of miles from the nearest landfall.",
  "*You and your friends have managed to save 10 items, undamaged and intact after the fire. In addition, you have salvaged a four-man rubber life craft and a box of matches*.",
  "*Your task*:  You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.",
  "\n\n#Payment:",
  "Your answers will be compared to a panel of experts' solutions. If a question from Part 1 is randomly selected to determine your payment at the end of the study, you will earn $x if your answer is correct, and $0 otherwise.",
  "Please click “Next stage” to proceed."
];

export const LAS_SCENARIO_REMINDER = "You and three friends are on a yacht trip across the Atlantic. A fire breaks out, and the skipper and crew are lost. The yacht is sinking, and your location is unclear.\nYou have saved 10 items, a life raft, and a box of matches.\n\nEvaluate the relative importance of items in each presented pair by selecting the one you believe is most useful. You can earn $X per correct answer if that question is drawn to determine your payoff.";

export const LAS_WTL_DESCRIPTION = "Thank you for completing the task.\n\nNow, imagine that you are no longer alone but part of a group of four people. Your group must elect a leader whose role is to answer on behalf of the group the same types of questions you have just seen. In this scenario, the leader is the only one who chooses the most useful items for survival from pairs, and their answers determine the payment for each member of the group.\n\nHow interested would you be in taking on the leader’s role described above? Please choose a number from 1 to 10, with 1 meaning that you would very much like to become the leader, and 10 meaning not at all.";

export const LAS_WTL_SURVEY : QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText:
      "How much would you like to become the group leader described above, and complete the task on behalf of your crew?",
    lowerBound: 'Not at all',
    upperBound: 'Very much',
  },
];


export const LAS_GROUP_CHAT_DESCRIPTION = "Discuss your responses to the previous task with your teammates. Take this opportunity to gauge the abilities of your crewmembers, as you will later vote for a representative whose performance will determine your payout.";

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
