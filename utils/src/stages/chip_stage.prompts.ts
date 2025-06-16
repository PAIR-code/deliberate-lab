import {UnifiedTimestamp} from '../shared';
import {SimpleChipLog} from './chip_stage';

// TODO: Update temporary prompt
export const CHIP_ASSISTANCE_DELEGATE_PROMPT =
  'Decide what trade you should make.';

// TODO: Update temporary prompt
export const CHIP_ASSISTANCE_COACH_PROMPT =
  'Review the following offer and give some feedback on if it should be changed.';

// TODO: Update temporary prompt
export const CHIP_ASSISTANCE_ADVISOR_PROMPT =
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
