/** Constants used in the Lost at Sea game */

import {
  QuestionConfig,
  SurveyQuestionKind,
} from '@llm-mediation-experiments/utils';

export const LAS_INTRO_DESCRIPTION = `This experiment should take an estimated 20-30 minutes.`;
export const LAS_INTRO_HTML = `<h3>Scenario</h3>
  <p>In this task, you are adrift on a private yacht in the North Atlantic with your crewmates. As a consequence of a fire of unknown origin, much of the yacht and its contents have been destroyed. The yacht is now slowly sinking. Your location is unclear because of the destruction of critical navigational equipment and because you and the crew were distracted trying to bring the fire under control.</p>
  <br/>
  <p>Your best estimate is that you are approximately one thousand miles south-southeast of the nearest land. You have a box of matches in your pocket.</p>
  <h3>Objective</h3>
  <p>After deliberating with your crewmates, your role is to elect a representative among the crew who will perform a <i>survival task</i> on behalf of the crew.</p>
  <br/>
  <p>Your payout from this task is dependent on how well the representative does on this task.</p>'`;

export const LAS_INITIAL_TASK_DESCRIPTION = `First, you will complete a task similar to the task that your crew's representative will later complete. Your performance on this task will not affect your payout; this is so that you get a sense of the task.`;

export const LAS_GROUP_INTRO_DESCRIPTION = `On the next stage, you will review and discuss your answers to the previous task with your crewmembers.`;
export const LAS_GROUP_INTRO_HTML = `<p>Take this opportunity to gauge the abilities of your crewmembers, as you will later vote for the team representative.</p>
  <br/>
  <p>As a reminder, the payoff in this task is <b>only dependent on the representative's performance on the final task</b>.</p>`;

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

export const LAS_LEADER_ELECTION_DESCRIPTION = `Now, please vote for a representative amongst your crewmates. This representative will complete a similar task on behalf of your crew. Your payout will depend on your representative's score on the next task.`;

export const LAS_LEADER_TASK_DESCRIPTION = `While we tally the votes, please complete this task <b>as if you were the representative</b>. If you are chosen as the representative, your performance on this task will determine the payout of your crew.`;

export const LAS_LEADER_REVEAL_DESCRIPTION = `We've tallied your votes!`;

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
