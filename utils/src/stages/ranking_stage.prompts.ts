/** Prompt constants and utils for interacting with ranking stage. */
import {ParticipantProfile, ParticipantProfileExtended} from '../participant';
import {RankingStageConfig, RankingType} from './ranking_stage';
import {getBaseStagePrompt} from './stage.prompts';

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

// TODO: Update example item-ranking prompt to use actual ranking logic, etc.
export const DEFAULT_AGENT_PARTICIPANT_RANKING_ITEMS_PROMPT = `
  Your job is to rank the following items.
  Return the ranked items' IDs in order separated by commas.
  For example: item3,item1,item2. Do not include
  any explanations or other information. Only return the list.
`;

// TODO: Update example participant-ranking prompt to use actual ranking logic,
// etc.
export const DEFAULT_AGENT_PARTICIPANT_RANKING_PARTICIPANTS_PROMPT = `
  Your job is to rank a series of participants. Return the ranked
  participants' IDs in order separated by commas.
  Do not include any explanations or other information. Only return the list.
`;

// TODO: Remove temporary list of example participants
// This is currently a shuffle list of participants (one for each letter A-Z)
export const EXAMPLE_RANKING_PARTICIPANTS: {name: string; publicId: string}[] =
  [
    {name: 'Strawberry Shortcake', publicId: 'strawberry-red-192'},
    {name: 'Onion Rings', publicId: 'onion-white-158'},
    {name: 'Zucchini Bread', publicId: 'zucchini-green-269'},
    {name: 'Lasagna', publicId: 'lasagna-red-125'},
    {name: 'Hamburger', publicId: 'hamburger-brown-896'},
    {name: 'Vanilla Pudding', publicId: 'vanilla-white-225'},
    {name: 'Apple Pie', publicId: 'apple-red-134'},
    {name: 'Kale Salad', publicId: 'kale-green-114'},
    {name: 'Udon Noodles', publicId: 'udon-white-214'},
    {name: 'Raspberry Tart', publicId: 'raspberry-red-181'},
    {name: 'Nachos', publicId: 'nachos-orange-147'},
    {name: 'Ice Cream Sundae', publicId: 'icecream-pink-912'},
    {name: 'Quiche Lorraine', publicId: 'quiche-yellow-170'},
    {name: 'Tacos', publicId: 'tacos-yellow-203'},
    {name: 'Eggplant Parmesan', publicId: 'eggplant-purple-538'},
    {name: 'Yorkshire Pudding', publicId: 'yorkshire-brown-258'},
    {name: 'Chocolate Cake', publicId: 'chocolate-brown-396'},
    {name: 'Waffles', publicId: 'waffles-golden-236'},
    {name: 'Donut Holes', publicId: 'donut-yellow-412'},
    {name: 'Xigua (Watermelon)', publicId: 'xigua-red-247'},
    {name: 'French Fries', publicId: 'frenchfries-golden-674'},
    {name: 'Garlic Bread', publicId: 'garlic-white-785'},
    {name: 'Macaroni and Cheese', publicId: 'macaroni-yellow-136'},
    {name: 'Jalapeno Poppers', publicId: 'jalapeno-green-103'},
    {name: 'Blueberry Muffins', publicId: 'blueberry-blue-265'},
    {name: 'Pizza', publicId: 'pizza-red-169'},
  ];

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Get ranking stage context (e.g., to use in prompt for future stage). */
export function getRankingStagePromptContext(
  stageConfig: RankingStageConfig,
  includeStageInfo: boolean,
  rankingList: string[], // ordered answers from RankingStageParticipantAnswer
) {
  return [
    getBaseStagePrompt(stageConfig, includeStageInfo),
    `You submitted the following ranking: ${rankingList.join(',')}`,
  ].join('\n');
}

/**
 *  Create prompt for current agent participant to
 *  complete ranking stage.
 */
// TODO: Update ranking prompt function to actually build working
// ranking stage prompts for agent participants!
export function createAgentParticipantRankingStagePrompt(
  participant: ParticipantProfileExtended,
  rankingStage: RankingStageConfig,
  participantList: ParticipantProfile[], // other participants to rank
) {
  // If ranking items, use items listed in stage config
  if (rankingStage.rankingType === RankingType.ITEMS) {
    const rankingItems = rankingStage.rankingItems;
    const prompt = `
      ${DEFAULT_AGENT_PARTICIPANT_RANKING_ITEMS_PROMPT}

      Items to rank: ${JSON.stringify(rankingItems)}

      List of item IDs:
    `;
    return prompt;
  }

  // Otherwise, use provided list of participants
  // TODO: Only include current participant if enableSelfVoting is true
  const participants: {name: string; id: string}[] = participantList.map(
    (participant) => {
      return {name: participant.name ?? '', id: participant.publicId};
    },
  );

  const prompt = `
    ${DEFAULT_AGENT_PARTICIPANT_RANKING_PARTICIPANTS_PROMPT}

    Participants to rank: ${JSON.stringify(participants)}

    List of participant IDs:
  `;

  return prompt;
}
