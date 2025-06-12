import {UnifiedTimestamp} from '../shared';
import {ChipLogEntry, ChipLogType} from './chip_stage';

export const DEFAULT_CHIP_CHAT_AGENT_PARTICIPANT_PROMPT = `You are playing a chip negotiation game. Talk to the other participants.`;

export function convertLogEntryToPromptFormat(entry: ChipLogEntry) {
  const getTime = (timestamp: UnifiedTimestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `(${hours}:${minutes})`;
  };

  switch (entry.type) {
    case ChipLogType.CHAT_MESSAGE:
      const message = entry.chatMessage;
      return `${getTime(entry.timestamp)} ${message.profile?.name ?? message.senderId}: ${message.message}`;
    case ChipLogType.ERROR:
      return `${getTime(entry.timestamp)}: ${entry.errorMessage}`;
    case ChipLogType.INFO:
      return `${getTime(entry.timestamp)}: ${entry.infoMessage}`;
    case ChipLogType.NEW_ROUND:
      return `${getTime(entry.timestamp)}: Round ${entry.roundNumber + 1} has started`;
    case ChipLogType.NEW_TURN:
      return `${getTime(entry.timestamp)}: ${entry.participantId}'s turn to submit an offer`;
    case ChipLogType.OFFER:
      return `${getTime(entry.timestamp)}: ${entry.offer.senderId} has made the offer ${entry.offer.id}: give ${JSON.stringify(entry.offer.sell)} and get ${JSON.stringify(entry.offer.buy)}`;
    case ChipLogType.OFFER_DECLINED:
      return `${getTime(entry.timestamp)}: Offer ${entry.offer.id} was declined`;
    case ChipLogType.TRANSACTION:
      return `${getTime(entry.timestamp)}: Deal made: ${entry.transaction.offer.senderId}'s offer ${entry.transaction.offer.id} was accepted by ${entry.transaction.recipientId}`;
    default:
      return '';
  }
}
