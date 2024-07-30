/** Constants used in the Lost at Sea game */

import {
  ItemName,
  QuestionConfig,
  SurveyQuestionKind,
} from '@llm-mediation-experiments/utils';

export const LAS_ID = 'lostAtSea';
export const LAS_DESCRIPTION =
  'An implementation of the Lost at Sea task (Born 2022) with pairwise elements.';

export const LAS_TOS = [
  'Thank you for participating in this study.',
  'This research is conducted by the Paris School of Economics and has been approved by their institutional review board for ethical standards.',
  'The study will take approximately X minutes, and you will be financially compensated for your time. Detailed instructions about the compensation will be provided in the relevant sections.',
  'By participating, you agree that your responses, including basic demographic information, will be saved. No identifiable personal data will be collected. All data will be anonymized and used solely for scientific research. Your data will not be shared with third parties.',
  "By clicking 'Next,' you accept these terms and proceed with the study.",
];

export const LAS_INTRO_DESCRIPTION = `This experiment should take an estimated X minutes.`;
export const LAS_INTRO_INFO_LINES = [
  'You will receive a fixed fee of $x for your participation. The experiment also gives you the opportunity to earn a $x bonus, based on your decisions. We will explain precisely how your bonus is determined later.',
  'At the end of the experiment, you will be redirected to a waiting page. This waiting time is part of the experiment and has been factored into your payment. **You will not be approved for the payout if you do not remain on this waiting page for the full requested duration**.',
  'During this waiting time, you may be invited to continue the experiment by completing two additional parts, Part 2 and Part 3. These parts will be played in *groups of four*, and should take an estimated additional  x minutes. In these parts, you will have the opportunity to earn a $x bonus, based on your decisions and the decisions of other participants. One of these parts will be randomly selected to determine your bonus. Additionally, you will receive a fixed fee of $x for completing Parts 2 and 3.',
  'To sum up:\n\n* You’ll complete a first part *individually*, and then wait to see if you are selected to take part in the next part of the experiment.\n* You need to wait the full amount of time to get your payoff for Part 1, even though you are not selected or choose to leave the experiment.\n* If you receive an invitation, you can then start the rest of the experiment, that is played in *groups of 4*',
  'Please click “Next stage” to proceed.',
];

export const LAS_INITIAL_TASK_INTRO_INFO_LINES = [
  '# Imagine the following scenario:',
  "You have chartered a yacht with three friends for a holiday trip across the Atlantic Ocean. None of you have sailing experience, so you hired an experienced skipper and a two-person crew. In the middle of the Atlantic a fierce fire breaks out in the ship's galley. The skipper and crew have been lost whilst trying to fight the blaze. Much of the yacht is destroyed and is slowly sinking. Vital navigational and radio equipment are damaged, and your location is unclear. Your best estimate is that you are many hundreds of miles from the nearest landfall.",
  '*You and your friends have managed to save 10 items, undamaged and intact after the fire. In addition, you have salvaged a four-man rubber life craft and a box of matches*.',
  '*Your task*:  You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.',
  '\n\n# Payment:',
  "Your answers will be compared to a panel of experts' solutions. If a question from Part 1 is randomly selected to determine your payment at the end of the study, you will earn $x if your answer is correct, and $0 otherwise.",
  'Please click “Next stage” to proceed.',
];

export const LAS_SCENARIO_REMINDER =
  'Here is a reminder of the scenario:\n\nYou and three friends are on a yacht trip across the Atlantic. A fire breaks out, and the skipper and crew are lost. The yacht is sinking, and your location is unclear.\nYou have saved 10 items, a life raft, and a box of matches.\n\nEvaluate the relative importance of items in each presented pair by selecting the one you believe is most useful. You can earn $X per correct answer if that question is drawn to determine your payoff.';

export const LAS_WTL_DESCRIPTION =
  'Thank you for completing the task.\n\nNow, imagine that you are no longer alone but part of a group of four people. Your group must elect a leader whose role is to answer on behalf of the group the same types of questions you have just seen. In this scenario, the leader is the only one who chooses the most useful items for survival from pairs, and their answers determine the payment for each member of the group.\n\nHow interested would you be in taking on the leader’s role described above? Please choose a number from 1 to 10, with 1 meaning that you would very much like to become the leader, and 10 meaning not at all.';

export const LAS_WTL_SURVEY: QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText:
      'How much would you like to become the group leader described above, and complete the task on behalf of your crew?',
    lowerBound: 'Not at all',
    upperBound: 'Very much',
  },
];

export const LAS_WAIT_INFO_LINES = [
  'Please wait on this page for x minutes. If you leave this page before the time is up, you will not be approved for the payout.',
  'A link may appear offering you the option to continue with the experiment.',
  'Thank you for your patience.',
];

/******** PART 2 *********** */
export const LAS_SECOND_PART_INTRO_INFO_LINES = [
  'You have previously completed the first part of the experiment. You are now about to start the second part.',
  '\n\nFor this part, and for the remainder of the experiment, you will work in groups. You have been randomly assigned to a group with 3 other participants who are taking part in the same experiment today.',
  '\n\nBelow is a general overview of the upcoming part of the experiment. Detailed explanations for each step will follow.',
  '\n\n1. **Group discussion about Part 1 answers**',
  '2. **Opportunity to update your individual answers from Part 1**',
  '3. **Election of a group leader**',
  '\n\n## Group discussion about Part 1 answers',
  'Your group will engage in a free-form chat discussion to evaluate the relative importance of the different items you’ve already seen in Part 1, based on their importance for group survival. More details about the chat will be given later.',
  '\n\n## Opportunity to update your individual answer',
  'After the chat ends, you will have the chance to revise the individual answers you provided in Part 1 of the experiment. You can choose to update your previous answers or to keep them the same.',
  "\n\nIf a question from Part 2 is selected to determine your final payoff, your answers will be evaluated in the same way as in Part 1. Your answers will be compared to a panel of experts' solutions, and you will earn $X if your answer is correct, and $0 otherwise.",
  '\n\nPlease note that Part 1 and Part 2 of the experiment are independent. Changing answers here will not impact the answers you provided in Part 1.',
  '\n\n## Election of a group leader for Part 3',
  "After the chat, and after you’ve had the chance to update your individual answers, you will be asked to elect a group leader who will play a crucial role in Part 3 of the experiment. In Part 3, your group will repeat the same task as in Part 1, but with different pairs of items. The leader’s answers regarding the most important items for survival will determine the team's final payoff.",
];

export const LAS_PE_DESCRIPTION =
  'Before you start the chat discussion, we would like you to guess how well you did in Part 1 compared to the other 3 members of your group. Please indicate your answer by clicking on one of the options below. If you think you earned the highest number of good answers in your group, click on the first option. If you think you earned the second highest number of good answers, click on the second option, and so on.';

export const LAS_PE_SURVEY: QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.MultipleChoice,
    questionText:
      'How well do you think you did compared to the other members of your group?',
    options: [
      {
        id: 0,
        text: 'My score was the best',
      },
      {
        id: 1,
        text: 'My score was the second best',
      },
      {
        id: 2,
        text: 'My score was the third best',
      },
      {
        id: 3,
        text: 'My score was the fourth best',
      },
    ],
  },
];

export const LAS_GROUP_DISCUSSION_INSTRUCTIONS = [
  'Your group will now engage in a free-form chat discussion to evaluate the relative importance of each item in the different pairs you’ve already seen, based on their importance for group survival.',
  '\n\nIn the chat, you will revisit each pair of items from Part 1. You need to discuss which item is most useful for survival by writing your arguments in the chat.',
  '\n\nDuring the chat discussion, please follow these guidelines to ensure a productive and collaborative experience:',
  '\n\n* **Participation Requirement:** Everyone must have spoken at least once before you can move to the next pair of items.',
  '* **Progression to the Next Set of Items:** You will move to the next set of items once everyone has clicked on the button “Ready to end discussion.” You can continue interacting even after clicking “Ready to end discussion” if not everyone has clicked yet.',
  '\n\n## Purpose of the Discussion:',
  '* **Debate Object Utility:** The goal is to debate the usefulness of the items using the most relevant and well-developed arguments possible. The more arguments you gather, the more useful it will be for Part 3, where different pairs of the same items will be evaluated. Whoever the leader is, knowing the best arguments will help them make the best decisions in Part 3.',
  '* **Gauge Abilities:** You can see this discussion as an opportunity to assess the abilities of your team members, as you will later vote for a representative whose performance will determine your payout.',
  '\n\nPlease keep these guidelines in mind as you engage in the discussion. Your active participation and thoughtful contributions are crucial for the success of the experiment.',
];

export const LAS_UPDATE_INSTRUCTIONS = [
  'You are now given a chance to update the choices you previously made in Part 1. You can choose to update your previous answers or provide the same answers again.',
  "\n\nIf a question from Part 2 is selected to determine your final payoff, the answers you give below will be evaluated in the same way as in Part 1. Your answers will be compared to a panel of experts' solutions, and you will earn $X if your answer is correct, and $0 otherwise.",
  '\n\n*Please note that Part 1 and Part 2 of the experiment are independent. Changing answers here will not impact the answers you provided in Part 1.*',
];

export const LAS_PE2_SURVEY: QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.MultipleChoice,
    questionText:
      'We also give you the opportunity to update your guess about how well you did in Part 1 compared to the other 3 members of your group. Please indicate your answer by clicking on one of the options below. If you think you earned the highest number of good answers in your group, click on the first option. If you think you earned the second highest number of good answers, click on the second option, and so on.',
    options: [
      {
        id: 0,
        text: 'My answer was the best',
      },
      {
        id: 1,
        text: 'My answer was the second best',
      },
      {
        id: 2,
        text: 'My answer was the third best',
      },
      {
        id: 3,
        text: 'My answer was the fourth best',
      },
    ],
  },
];

export const LAS_LEADER_ELECTION_INSTRUCTIONS = [
  'You are now about to elect a group leader who will play a role in the next part of the experiment (Part 3). In Part 3, the same task as in Part 1 will be played, with different pairs of items.',
  "\n\nFor each question, the leader will be responsible for submitting the final answer on behalf of the group. The leader's answers will be evaluated in the same manner as in Parts 1 and 2 and will determine the payoff for all group members. Therefore, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nBelow is an overview of the election process.',
  '\n\n**Step 1: Indicating interest** - You will first be asked to indicate how much you want to become the group leader on a scale from 1 to 10.',
  '**Step 2: Ranking your teammates** - You will rank your three teammates, with your preferred leader at position 1, the second most preferred leader at position 2, and the third most preferred leader at position 3. You cannot vote for yourself.',
  '\n\nWe will use your answers to these two questions to select the leader:',
  '- The two group members who express the most interest in becoming the leader will be selected as candidates for the election. If several group members choose the same number, the computer will randomly determine the order of these group members.',
  '- The highest-ranked candidate among the two will be elected as leader. If both candidates tie, the decision will be made randomly.',
  '\n\nWith this process, you are asked to rank your team members before knowing who the candidates are. Only the rankings of the two group members who are not candidates will be considered. This ensures that you cannot vote strategically to increase your own chances of being elected as the leader. Therefore, it is in the interest of all group members to provide their true, preferred ranking of the other group members.',
  '\n\nWhile these calculations are being performed, you will be invited to complete Part 3. Keep in mind that your performance might determine everyone’s payoff for this part, as you could potentially be the leader without knowing it yet.',
  '\n\nYou will learn who the candidates were and who is elected as the leader at the end of Part 3. Your score indicating how much you wanted to become the leader will not be disclosed to the group.',
];

export const LAS_WTL_2_DESCRIPTION =
  'Please indicate your willingness to become the group leader.';

export const LAS_WTL_2_SURVEY: QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText:
      'How much would you like to become the group leader in Part 3?',
    lowerBound: 'Not at all',
    upperBound: 'Very much',
  },
];

export const LAS_LEADER_REMINDER =
  'Your group must elect a leader whose role is to answer on behalf of the group the same types of questions you have just seen. In this scenario, the leader is the only one who chooses the most useful items for survival from pairs, and their answers determine the payment for each member of the group.';

export const LAS_LEADER_ELECTION_DESCRIPTION = `On this page, you will submit your vote for who should become the group leader. Below, you see a list of the other members of your group. Cast your vote by ranking the other group members according to who you would like to see lead your group. *Remember, you cannot affect your own chances of being elected. If you are one of the two candidates in the election, your vote doesn't count for the outcome of the election. Therefore, it is in your best interest to rank all group members based on who you would like to see lead the group.*`;

export const LAS_PART_3_INSTRUCTIONS = [
  'You are invited to complete Part 3, while the computer gathers information to determine who the elected leader is. In this part, everyone will complete the same task as in Part 1, but with a new set of questions. However, only the leader’s answers will determine the payoff for this task.',
  '\n\nSince you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone’s payoff for this part.',
  "\n\nFor each question, the leader's answers will be evaluated in the same manner as in Part 1 and will determine the payoff for all group members. Thus, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nAfter the task ends, the entire group will be informed who the candidates were and who was elected as the leader. Your score indicating how much you wanted to become the leader will not be disclosed to the group.',
];

export const LAS_GROUP_CHAT_DESCRIPTION =
  'Discuss your responses to the previous task with your teammates. Take this opportunity to gauge the abilities of your crewmembers, as you will later vote for a representative whose performance will determine your payout.';

export const LAS_REDO_TASK_DESCRIPTION = `Have your opinions on the ordering of the items pairs changed following the discussion with crewmates? Now, please update your initial responses.`;

export const LAS_LEADER_TASK_DESCRIPTION = `While we tally the votes, please complete this task as if you were the representative. If you are chosen as the representative, your performance on this task will determine the payout of your crew! As in the initial task, your task is to choose the item that will better help your crew to survive on the raft.`;

export const LAS_LEADER_REVEAL_DESCRIPTION =
  'Here are the results from the task.';

export const LAS_FINAL_SURVEY_DESCRIPTION = `Thanks for participating. Please complete this final survey.`;
export const LAS_REVEAL_INFO = `An explanation of the results can be found [here](https://raw.githubusercontent.com/PAIR-code/llm-mediation-experiments/main/lit/src/assets/lost_at_sea_answers.pdf).`;

export const LAS_FINAL_SURVEY: QuestionConfig[] = [
  {
    id: 0,
    kind: SurveyQuestionKind.Text,
    questionText:
      'Consider the survival task performed in this study. Did you have any prior knowledge or experience in the domain of survival that could have helped you solve the task? If yes, please share specific memories or experiences that explain your answer.',
  },
  {
    id: 1,
    kind: SurveyQuestionKind.Scale,
    questionText: 'Rate how happy you were with the final outcome.',
    lowerBound: 'I was very disappointed (0/10)',
    upperBound: 'I was very happy (10/10)',
  },
];

export const ITEMS_SET_1: Array<[ItemName, ItemName]> = [
  ['floatingSeatCushion', 'shavingMirror'],
  ['canOilMixture', 'waterContainer'],
  ['armyRations', 'plasticSheeting'],
  ['nylonRope', 'mosquitoNetting'],
  ['pacificMaps', 'transistorRadio'],
];

export const ITEMS_SET_2: Array<[ItemName, ItemName]> = [
  ['shavingMirror', 'nylonRope'],
  ['canOilMixture', 'mosquitoNetting'],
  ['waterContainer', 'floatingSeatCushion'],
  ['armyRations', 'transistorRadio'],
  ['plasticSheeting', 'pacificMaps'],
];

export const ITEMS_SET_3: Array<[ItemName, ItemName]> = [
  ['pacificMaps', 'nylonRope'],
  ['plasticSheeting', 'canOilMixture'],
  ['shavingMirror', 'mosquitoNetting'],
  ['floatingSeatCushion', 'armyRations'],
  ['transistorRadio', 'waterContainer'],
];
