import {UnifiedTimestamp} from '../shared';
import {
  StructuredOutputConfig,
  StructuredOutputDataType,
  createStructuredOutputConfig,
  printSchema,
} from '../structured_output';
import {SimpleChipLog} from './chip_stage';

// TODO: Update temporary prompt
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

// TODO: Update temporary prompt
export const CHIP_OFFER_ASSISTANCE_ADVISOR_PROMPT =
  'Suggest a trade that should be made and explain why.';

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
