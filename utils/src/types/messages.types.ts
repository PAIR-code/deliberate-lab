/** Chat message types */

import { uniqueId } from '../utils/algebraic.utils';
import { UnifiedTimestamp } from './api.types';
import { ItemPair } from './items.types';

export enum MessageKind {
  UserMessage = 'userMessage',
  DiscussItemsMessage = 'discussItemsMessage',
  MediatorMessage = 'mediatorMessage',
}

export interface MessageBase {
  uid: string;
  kind: MessageKind;

  timestamp: UnifiedTimestamp;
  text: string;
}

export interface UserMessage extends MessageBase {
  kind: MessageKind.UserMessage;

  fromPublicParticipantId: string;
}

export interface DiscussItemsMessage extends MessageBase {
  kind: MessageKind.DiscussItemsMessage;

  itemPair: ItemPair;
}

export interface MediatorMessage extends MessageBase {
  kind: MessageKind.MediatorMessage;
}

export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultUserMessage = (timestamp: UnifiedTimestamp): UserMessage => ({
  uid: uniqueId('message'),
  kind: MessageKind.UserMessage,
  timestamp,
  fromPublicParticipantId: '',
  text: 'fakeMessage',
});

export const getDefaultMediatorMessage = (timestamp: UnifiedTimestamp): MediatorMessage => ({
  uid: uniqueId('message'),
  kind: MessageKind.MediatorMessage,
  timestamp,
  text: 'fakeMessage',
});
