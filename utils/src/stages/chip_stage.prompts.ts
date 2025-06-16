import {UnifiedTimestamp} from '../shared';
import {SimpleChipLog} from './chip_stage';

// TODO: Update temporary prompt
export const CHIP_OFFER_ASSISTANCE_DELEGATE_PROMPT =
  'Decide what trade you should make.';

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
Your response must use these EXACT tags below. The response should include nothing else besides the tags, your trade offer, and your reasoning. The text between tags should be concise.

\`\`\`
<REASONING>
[Provide your concise reasoning in a few sentences, e.g. To gain more surplus, I want more xxx chips]
</REASONING>

<FEEDBACK> your feedback to show to the player </FEEDBACK>
\`\`\`
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
