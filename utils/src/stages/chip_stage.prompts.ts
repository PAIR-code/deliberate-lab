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
  return `You are a strategic agent playing a bargaining game on behalf of ${playerName}. 
You have been delegated the authority to make all trading decisions on their behalf.
Your sole directive is to secure the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective.

### Current game state
* **${playerName}'s chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **${playerName}'s chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Proposing a trade

Remember, your trade proposal must adhere to the following:
1.  **Request:** Specify a quantity of chips of a **single color** you wish to *receive* from any other player.
2.  **Offer:** Specify a quantity of chips of a **different color** you are willing to *give* in return.


Your goal is to make as much money as possible by making an advantageous proposal that is likely to be accepted. The trades, you choose to make to accomplish this, are up to you.
Be rational - do not propose a trade in which thie user loses money. The value of a trade is the difference between the total value of chips received (buyQuantity x ${playerName} valuation of buyType) minus the total value of chips sold (sellQuantity x ${playerName} valuation). Only propose trades that give positive value.

The trade explanation is shown to the user; it should be concise and directed towards the user from your perspective as their trade delegate. 

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
tradeExplanation: By offering 4 purple chips for 4 blue chips, I exchanged your least-valued chip for your most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
tradeExplanation: Both Player B and Player C avoid purple but seem eager for red. This trade tests whether they undervalue blue. If accepted, you will gain surplus and shed medium-value chips.

## Guidelines
1. Try to AVOID VERY CONSERVATIVE trades, e.g. 1 chip for 1 chip. Remember you only have 3 chances to propose trades.
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
            description:
              'Your concise feedback for the player in 1-2 short, easy-to-read sentences.',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your concise reasoning for the suggested move in 1-2 short, easy-to-read sentences.',
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
              'In 2–3 concise sentences, explain why *you* believe this trade helps *the user* to maximize *their* surplus; for example, "I think that you should do this, because..". Stay consistent and avoid using third-person references like "the player" or "they."',
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
  Your sole directive is to coach ${playerName} into securing the maximum possible surplus by the end of the game.

### Current game state
* **${playerName} chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **${playerName} chip inventory:** ${playerChipQuantities}.
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

Your goal is to coach the player ${playerName} into making proposals that make as much money as possible. Do not encourage a trade in which they lose money. The value of a trade is the difference between the total value of chips received (quantity x the player's valuation) minus the total value of chips they give up (quantity x valuation). Only recommend trades that give positive value.


The trade explanation is shown to the user; it should be concise and directed towards the user from your perspective as their coach.

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
feedback: This is a good proposal; you're trading your least-valued chip for your most-valued chip. This is also likely to be accepted by Player C, who has consistently sought purple chips and holds 4 red chips.
reasoning: By offering 4 purple chips for 4 blue chips, I exchanged your least-valued chip for your most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
feedback: While you may propose this offer to see whether the others undervalue blue chips, this is your final turn to propose a trade. Consider whether you can make a more valuable offer.
reasoning: Both Player B and Player C avoid purple but seem eager for red. This trade tests whether they undervalue blue. If accepted, you will gain surplus and shed medium-value chips.

## Guidelines
1. Try to AVOID VERY CONSERVATIVE proposals, e.g. 1 chip for 1 chip. Remember you only have 3 chance to propose.
2. The player CANNOT request more chips than they currently have.
3. Remember, your goal is to coach the user into making the best proposal possible. Be concise and clear in your feedback.

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
            description: `Check if the user has sufficient chips to trade. If they have n green chips, they can at most give n green chips. If it is not advantageous for the user to trade, they can ask for a large amount of chips that no one can afford.`,
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Provide your concise reasoning in a few sentences, e.g. To gain more surplus, you may want more xxx chips',
          },
        },
        {
          name: 'loss',
          schema: {
            type: StructuredOutputDataType.STRING,
            description: `Given your thoughts on the proposal, check to make sure you aren't losing money (your valuation * chips you are offering) < your valuation * chips you are receiving. For example, if you value the red chip at 6 and blue chip at 8. By proposing to GET 5 red chips and GIVE 3 blue chips, your surplus change will be + 5*6 - 3*8 = +6. So you get 6 positive surplus gains. But if you propose to GET 5 red chips and GIVE 4 blue chips, your surplus change will be + 5*6 - 4*8 = -2. So you get negative surplus gain.`,
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
              'In 2–3 concise sentences, explain why *you* believe this trade helps *the user* to maximize *their* surplus; for example, "I think that you should do this, because..". Stay consistent and avoid using third-person references like "the player" or "they."',
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
Your sole directive is to advise the user into securing the maximum possible surplus by the end of the game.
Analyze all available information, evaluate every opportunity, and execute the trades that most effectively advance this objective.

### Current game state
* **${playerName}'s chip valuations:** ${playerChipValues}
 * Remember that all players value green chips at $0.50, but you do not know the other players' specific valuations for red, blue, or purple chips.
* **${playerName}'s chip inventory:** ${playerChipQuantities}.
 * Remember that all players started with 10 chips of each color.
* **All players' chip inventory:** ${chipsetDescription}
* **Transaction history:** ${negotiationHistory}
 * Remember that there are 3 rounds of trading; in each round, every player gets to propose one trade and respond to other player's trades.
After this round, there are ${numRoundsLeft} rounds left.

### Proposing a trade

Remember, a trade proposal must adhere to the following:
1.  **Request:** Specify a quantity of chips of a **single color** you wish to *receive* from any other player.
2.  **Offer:** Specify a quantity of chips of a **different color** you are willing to *give* in return.

Your goal is to help ${playerName} make as much money as possible through offering advantageous trades that will be accepted by others. Be rational - do not propose a trade in which you lose money. The value of a trade is the difference between the total value of chips received receive (buyQuantity x the player's valuation of that chip type) minus the total value of chips given up (sellQuantity x valuation). Only propose trades that yield positive value.

## Good Examples
### Example 1:
suggestedBuyType: red,
suggestedBuyQuantity: 4,
suggestedSellType: purple,
suggestedSellQuantity: 4,
tradeExplanation: By offering 4 purple chips for 4 blue chips, you can exchange your least-valued chip for your most-valued. Player C has consistently sought purple chips and holds 4 red chips; a 4-for-4 offer is likely to be accepted.

### Example 2:
suggestedBuyType: blue,
suggestedBuyQuantity: 6,
suggestedSellType: red,
suggestedSellQuantity: 4,
tradeExplanation: Both Player B and Player C avoid purple but seem eager for red. Since this is an earlier round, it's useful to assess whether they undervalue blue. If this offer is accepted, you'll earn some money and shed medium-value chips.

## Guidelines
1. Try to AVOID VERY CONSERVATIVE trades, e.g. 1 chip for 1 chip. Remember that the user only has 3 chances to propose.
2. The user CANNOT request more chips than a player currently has. For example, if the other players have 4 and 5 RED chips respectively, the user cannot request more than 5 RED chips in total.

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
              'Your concise coaching feedback for the player in 1-2 short, easy-to-read sentences.',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your concise reasoning validating your coaching feedback.',
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
            description:
              'Your concise feedback for the player in 1-2 short, easy-to-read sentences.',
          },
        },
        {
          name: 'reasoning',
          schema: {
            type: StructuredOutputDataType.STRING,
            description:
              'Your concise reasoning for the move in 1-2 short, easy-to-read sentences.',
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
