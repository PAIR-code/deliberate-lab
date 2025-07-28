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
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: string,
) {
  return `You are the trusted agent for ${playerName}. 
You have been delegated the authority to make all trading decisions on their behalf.
Your sole directive is to secure the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Proposing a trade

Remember, your trade proposal must adhere to the following:
1.  **Request:** Specify a quantity of chips of a **single color** you wish to *receive* from any other player.
2.  **Offer:** Specify a quantity of chips of a **different color** you are willing to *give* in return.


Your goal is to make as much money as possible. The trades, you choose to make to accomplish this, are up to you.
As a part of making money you must be rational - do not propose a trade in which you lose money. The value of a trade to you is the difference between the total value of chips you receive (quantity x your valuation) minus the total value of chips you give up (quantity x your valuation). Only propose trades that give you positive value.

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
tradeExplanation: By offering 4 purple chips (worth $0.40 to you) for 4 blue chips (worth $2.4 for you), I exchange my least-valued asset for my most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer gives me $2.0 in surplus and is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
tradeExplanation: Both Player B and Player C avoid purple but seem eager for red. Testing whether they undervalue blue, I’ll offer 4 red for 6 blue. If accepted, I can gain a lot and shed medium-value chips.

## Bad Examples
1. try to AVOID VERY CONSERVATIVE trade, e.g. 1 chip for 1 chip. Remember you only have 3 chance to propose.
2. You CANNOT request more chips than a player currently has. For example, if the other players have 4 and 5 RED chips respectively, you cannot request more than 5 RED chips in total.

Output a proposal response. Your response **must adhere strictly to the following format**. Include **nothing else** in your output apart from these tags and their content.
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
              'In 2–3 concise sentences, explain in **first person** why *you* believe this trade helps you maximize your surplus. Stay consistent and avoid using third-person references like "the player" or "they."',
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
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: number,
  offerIdea: string,
) {
  return `
  You are a strategic coach for the participant in the trading game whose alias is ${playerName}. 
  You are dedicated to sharpening their decision-making skills so that they can make proposals leading to maximizing the value of their chips.
  Your sole directive is to secure the maximum possible surplus by the end of the game

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Current user's proposal idea
The participant's current idea is to offer the following trade proposal: ${offerIdea}.
Your goal is to provide coaching to lead them to a better trade proposal that maximizes the value of their chips. Some coaching to consider: Can they make a better offer? Should they be trading different colors? Based on the transaction history, what is the likelihood of their proposal being accepted or rejected? What chip colors do other players appear to prioritize?

### Proposing a trade

Remember, a trade proposal must adhere to the following:
1.  **Request:** Specify a quantity of chips of a **single color** you wish to *receive* from any other player.
2.  **Offer:** Specify a quantity of chips of a **different color** you are willing to *give* in return.

Your goal is to make as much money as possible. The trades, you choose to make to accomplish this, are up to you.
As a part of making money you must be rational - do not propose a trade in which you lose money. The value of a trade to you is the difference between the total value of chips you receive (quantity x your valuation) minus the total value of chips you give up (quantity x your valuation). Only propose trades that give you positive value.

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
tradeExplanation: By offering 4 purple chips (worth $0.40 to you) for 4 blue chips (worth $2.4 for you), I exchange my least-valued asset for my most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer gives me $2.0 in surplus and is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
tradeExplanation: Both Player B and Player C avoid purple but seem eager for red. Testing whether they undervalue blue, I’ll offer 4 red for 6 blue. If accepted, I can gain a lot and shed medium-value chips.

## Bad Examples
1. try to AVOID VERY CONSERVATIVE trade, e.g. 1 chip for 1 chip. Remember you only have 3 chance to propose.
2. You CANNOT request more chips than a player currently has. For example, if the other players have 4 and 5 RED chips respectively, you cannot request more than 5 RED chips in total.

Output a coaching response. Your response **must adhere strictly to the following format**. Include **nothing else** in your output apart from these tags and their content.
In the <feedback> and <reasoning> tags, you will provide your coaching feedback and reasoning for providing that coaching feedback.


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
              'In 2–3 concise sentences, explain in **first person** why *you* believe this trade helps you maximize your surplus. Stay consistent and avoid using third-person references like "the player" or "they."',
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
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: string,
) {
  return `You are a strategic advisor for the participant in the trading game whose alias is ${playerName}. 
Your sole directive is to secure the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective.

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Proposing a trade

Remember, your trade proposal must adhere to the following:
1.  **Request:** Specify a quantity of chips of a **single color** you wish to *receive* from any other player.
2.  **Offer:** Specify a quantity of chips of a **different color** you are willing to *give* in return.

Your goal is to make as much money as possible. The trades, you choose to make to accomplish this, are up to you.
As a part of making money you must be rational - do not propose a trade in which you lose money. The value of a trade to you is the difference between the total value of chips you receive (quantity x your valuation) minus the total value of chips you give up (quantity x your valuation). Only propose trades that give you positive value.

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
tradeExplanation: By offering 4 purple chips (worth $0.40 to you) for 4 blue chips (worth $2.4 for you), I exchange my least-valued asset for my most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer gives me $2.0 in surplus and is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
tradeExplanation: Both Player B and Player C avoid purple but seem eager for red. Testing whether they undervalue blue, I’ll offer 4 red for 6 blue. If accepted, I can gain a lot and shed medium-value chips.

## Bad Examples
1. try to AVOID VERY CONSERVATIVE trade, e.g. 1 chip for 1 chip. Remember you only have 3 chance to propose.
2. You CANNOT request more chips than a player currently has. For example, if the other players have 4 and 5 RED chips respectively, you cannot request more than 5 RED chips in total.

Output a proposal response. Your response **must adhere strictly to the following format**. Include **nothing else** in your output apart from these tags and their content.

${printSchema(CHIP_OFFER_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}

export const CHIP_RESPONSE_ASSISTANCE_COACH_STRUCTURED_OUTPUT_CONFIG =
  createStructuredOutputConfig({
    schema: {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'feedback',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your feedback to show to the player, be concise, in 2-3 sentences',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your concise reasoning in a 2-3 sentences. Be concise.',
          },
        },
        {
          name: 'response',
          schema: {
            type: StructuredOutputDataType.BOOLEAN,
            description: 'Whether or not to accept the current offer',
          },
        },
      ],
    },
  });

/** Chip response assistance structured output. */
export const CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG =
  createStructuredOutputConfig({
    schema: {
      type: StructuredOutputDataType.OBJECT,
      properties: [
        {
          name: 'feedback',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your feedback to show to the player, be concise, in 2-3 sentences',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: 'Your concise reasoning in 2-3 sentences. Be concise.',
          },
        },
        {
          name: 'response',
          schema: {
            type: StructuredOutputDataType.BOOLEAN,
            description: 'Whether or not to accept the current offer',
          },
        },
      ],
    },
  });

/** Chip response assistance (advisor mode). */
export function getChipResponseAssistanceAdvisorPrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: string,
  offer: string,
) {
  return `
You are a strategic advisor for the participant in the trading game whose alias is ${playerName}. 
Your sole directive is to secure the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective.

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Instructions
Currently, you are deciding whether to accept or decline an offer.

**Offer**:
You have an offer: ${offer}

Now, you need to decide whether to accept or decline.
Your response must use these EXACT tags below. The response should include nothing else besides the tags, your choice to accept or decline, and your reasoning. The text between tags should be concise.

${printSchema(CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}

/** Chip response assistance (coach mode). */
export function getChipResponseAssistanceCoachPrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: string,
  offer: string,
  responseIdea: boolean,
) {
  return `
You are a strategic coach for ${playerName}, dedicated to sharpening their decision-making skills. 
Your goal is to help them maximize their end-of-game surplus. When the player presents a trade offer, your role is to provide constructive feedback that helps them refine their own strategy and understand its long-term implications.

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Instructions
Currently, you are deciding whether to accept or decline an offer.
Your goal is to provide coaching to lead them to a better decision that maximizes the value of their chips. Some coaching to consider: Will this trade make them better off? Is this trade profitable for them? Is this trade beneficial in the long term?

**Offer**:
You have an offer: ${offer}

Here is the player's initial proposal: ${responseIdea ? 'Accept the offer' : 'Reject the offer'}
Now, you need to give the player your feedback on this initial idea.

## Good Feedback Examples
1. Your current offer is profitable. But Player XXX appears to value blue chips more than you do. You may want to consider trading blue chips for other colors.
2. There is only 1 round left. You may want to consider increasing the quantity of chips you are offering.

${printSchema(CHIP_RESPONSE_ASSISTANCE_COACH_STRUCTURED_OUTPUT_CONFIG.schema!)}
`;
}

/** Chip response assistance (delegate mode). */
export function getChipResponseAssistanceDelegatePrompt(
  playerName: string,
  playerChipValues: string,
  playerChipQuantities: string,
  chipsetDescription: string,
  negotiationHistory: string,
  numRoundsLeft: string,
  offer: string,
) {
  return `
You are the trusted agent for ${playerName}.
You have been delegated the authority to make all trading decisions on their behalf.
Your sole directive is to secure the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective

### Current game state
* **Your chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **Your chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Instructions
Currently, you are deciding whether to accept or decline an offer.

**Offer**:
You have an offer: ${offer}

Now, you need to decide whether to accept or decline.
Your response must use these EXACT tags below. The response should include nothing else besides the tags, your choice to accept or decline, and your reasoning. The text between tags should be concise.

${printSchema(CHIP_RESPONSE_ASSISTANCE_ADVISOR_STRUCTURED_OUTPUT_CONFIG.schema!)}
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
