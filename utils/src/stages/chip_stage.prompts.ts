import {UnifiedTimestamp} from '../shared';
import {
  StructuredOutputConfig,
  StructuredOutputDataType,
  createStructuredOutputConfig,
  printSchema,
} from '../structured_output';
import {SimpleChipLog} from './chip_stage';

/** Chip offer assistance delegate prompt. */
export function getChipOfferAssistanceDelegatePrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  negotiationHistory: string,
  numRoundsLeft: string,
) {
  return `
You are the trusted agent for ${playerName}. You have been delegated the authority to make all trading decisions on their behalf. Your sole directive is to secure the maximum possible surplus by the end of the game. Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective.

Your valuations of the different types of chips are: ${playerChipValues}.

You now have the following amounts of each chip: ${playerChipQuantities}.

The trade history so far is:
${negotiationHistory}

There are only ${numRoundsLeft} rounds left.

Now, you need to decide what and how much to give and to receive.
REMEMBER the player now has the following amounts of each chip: ${playerChipQuantities}.

${printSchema(CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}
export const CHIP_OFFER_ASSISTANCE_DELEGATE_PROMPT =
  'Decide what trade you should make.';

/** Chip offer assistance structured output. */
export const CHIP_OFFER_ASSISTANCE_STRUCTURED_OUTPUT_CONFIG =
  createStructuredOutputConfig({
    schema: {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'feedback',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your feedback to show to the player',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your concise reasoning in a few sentences',
          },
        },
        {
          name: 'suggestedBuyType',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your suggested type of chip for the user to buy',
          },
        },
        {
          name: 'suggestedBuyQuantity',
          schema: {
            type: StructuredOutputDataType.NUMBER,
            description:
              'Your suggested quantity of chip for the user to buy, given the type of chip that the user is buying',
          },
        },
        {
          name: 'suggestedSellType',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your suggested type of chip for the user to sell',
          },
        },
        {
          name: 'suggestedSellQuantity',
          schema: {
            type: StructuredOutputDataType.NUMBER,
            description:
              'Your suggested quantity of chip for the user to sell, given the type of chip that the user is selling',
          },
        },
        {
          name: 'tradeExplanation',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'An explanation of why you chose the suggested buy chip type/quantity and sell chip type/quantity',
          },
        },
      ],
    },
  });

/** Chip offer assistance (coach mode). */
export function getChipOfferAssistanceCoachPrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  negotiationHistory: string,
  numRoundsLeft: number,
  offerIdea: string,
) {
  return `
You are a strategic coach for ${playerName}, dedicated to sharpening their decision-making skills. Your goal is to help them maximize their end-of-game surplus. When the player presents a trade offer, your role is to provide constructive feedback that helps them refine their own strategy and understand its long-term implications.

The player’s valuations of the different types of chips are: ${playerChipValues}.
The player now has the following amounts of each chip: ${playerChipQuantities}.
The trade history so far is:
${negotiationHistory}

There are only ${numRoundsLeft} rounds left.

Here is the player’s initial idea: ${offerIdea}.

Now, you need to give the player your feedback on this initial idea.
REMEMBER the player now has the following amounts of each chip: ${playerChipQuantities}.

${printSchema(CHIP_OFFER_ASSISTANCE_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}

/** Chip offer assistance advisor structured output. */
export const CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG =
  createStructuredOutputConfig({
    schema: {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'check',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: `Check if you have sufficient chips to trade. If you have n green chips, you can at most give n green chips. If you don't want to trade, you can ask for a large amount of chips that no one can afford`,
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Provide your concise reasoning in a few sentences, e.g. To gain more surplus, I want more xxx chips',
          },
        },
        {
          name: 'loss',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: `Given your thoughts on the proposal, check to make sure you aren't losing money (your valuation * chips you are offering) < your valuation * chips you are receiving. For example, if you value the red chip at 6 and blue chip at 8. By proposing to GET 5 red chips and GIVE 3 blue chips, your surplus change will be + 5*6 - 3*8 = +6. So you get 6 positive surplus gains. BBut if you propose to GET 5 red chips and GIVE 4 blue chips, your surplus change will be + 5*6 - 4*8 = -2. So you get negative surplus gain.`,
          },
        },
        {
          name: 'suggestedBuyType',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your suggested type of chip for the user to buy',
          },
        },
        {
          name: 'suggestedBuyQuantity',
          schema: {
            type: StructuredOutputDataType.NUMBER,
            description:
              'Your suggested quantity of chip for the user to buy, given the type of chip that the user is buying',
          },
        },
        {
          name: 'suggestedSellType',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your suggested type of chip for the user to sell',
          },
        },
        {
          name: 'suggestedSellQuantity',
          schema: {
            type: StructuredOutputDataType.NUMBER,
            description:
              'Your suggested quantity of chip for the user to sell, given the type of chip that the user is selling',
          },
        },
        {
          name: 'tradeExplanation',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'An explanation of why you chose the suggested buy chip type/quantity and sell chip type/quantity',
          },
        },
      ],
    },
  });

/** Chip offer assistance (advisor mode). */
export function getChipOfferAssistanceAdvisorPrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  negotiationHistory: string,
  numRoundsLeft: string,
) {
  return `
You are a strategic advisor to ${playerName}. Your primary objective is to maximize their surplus by the end of the game. Proactively analyze the current game state to identify and recommend the most advantageous trades. For each recommendation, provide a clear rationale, including potential risks and rewards, to empower your player to make the final, informed decision.

The player’s valuations of the different types of chips are: ${playerChipValues}.

The player now has the following amounts of each chip: ${playerChipQuantities}.

The trade history so far is:
${negotiationHistory}

There are only ${numRoundsLeft} rounds left.

Now, you need to give the player a recommendation along with the reason.
REMEMBER the player now has the following amounts of each chip: ${playerChipQuantities}.

${printSchema(CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}

export const DEFAULT_CHIP_CHAT_AGENT_PARTICIPANT_PROMPT = `You are playing a chip negotiation game. Talk to the other participants.`;

export function convertChipLogToPromptFormat(log: SimpleChipLog) {
  // TODO: Create shared utils function for this
  const getTime = (timestamp: UnifiedTimestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `(${hours}:${minutes})`;
  };

  if (log.timestamp) {
    return `${getTime(log.timestamp)}: ${log.message}`;
  }
  return log.message;
}
