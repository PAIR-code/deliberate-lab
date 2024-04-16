/** Chat message types */

import { ItemPair } from './items.types';

// TODO: refactor messages with the backend structure in mind

export enum MessageType {
  UserMessage = 'userMessage',
  DiscussItemsMessage = 'discussItemsMessage',
  MediatorMessage = 'mediatorMessage',
}

export interface MessageBase {
  chatId: string;
  messageType: MessageType;
  timestamp: string;
  text: string;
}

export interface UserMessage extends MessageBase {
  messageType: MessageType.UserMessage;

  fromUserId: string;
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
//                                   MESSAGE MUTATION TYPES                                      //
// ********************************************************************************************* //

export interface UserMessageMutationData {
  chatId: string;
  text: string;
  fromUserId: string;
  // ...the other fields will be filled in by the backend for security
}

export interface DiscussItemsMessageMutationData {
  chatId: string;
  text: string;
  itemPair: ItemPair;
  // itemRatingToDiscuss: ItemRating;
}

export interface MediatorMessageMutationData {
  chatId: string;
  text: string;
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultUserMessage = (): UserMessage => ({
  chatId: '',
  messageType: MessageType.UserMessage,
  timestamp: new Date().toISOString(),
  fromUserId: '',
  text: 'fakeMessage',
});

export const getDefaultMediatorMessage = (): MediatorMessage => ({
  chatId: '',
  messageType: MessageType.MediatorMessage,
  timestamp: new Date().toISOString(),
  text: 'fakeMessage',
});
