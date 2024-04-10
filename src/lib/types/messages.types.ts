/** Chat message types */

import { ItemPair } from './items.types';
import { ParticipantProfile, getDefaultProfile } from './participants.types';

// TODO: refactor messages with the backend structure in mind

export enum MessageType {
  UserMessage = 'userMessage',
  DiscussItemsMessage = 'discussItemsMessage',
  MediatorMessage = 'mediatorMessage',
}

export interface MessageBase {
  messageType: MessageType;
  timestamp: string;
  text: string;
}

export interface UserMessage extends MessageBase {
  messageType: MessageType.UserMessage;

  fromUserId: string;
  fromProfile: ParticipantProfile;
}

export interface DiscussItemsMessage extends MessageBase {
  messageType: MessageType.DiscussItemsMessage;

  itemPair: ItemPair;
  // itemRatingToDiscuss: ItemRating;
}

export interface MediatorMessage extends MessageBase {
  messageType: MessageType.MediatorMessage;
}

export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultUserMessage = (): UserMessage => ({
  messageType: MessageType.UserMessage,
  timestamp: new Date().toISOString(),
  fromUserId: '',
  fromProfile: getDefaultProfile(),
  text: 'fakeMessage',
});

export const getDefaultMediatorMessage = (): MediatorMessage => ({
  messageType: MessageType.MediatorMessage,
  timestamp: new Date().toISOString(),
  text: 'fakeMessage',
});
