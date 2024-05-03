/** Chat message types */

import { uniqueId } from "../utils/algebraic.utils";
import { UnifiedTimestamp } from "./api.types";
import { ItemPair } from "./items.types";

export enum MessageType {
  UserMessage = "userMessage",
  DiscussItemsMessage = "discussItemsMessage",
  MediatorMessage = "mediatorMessage",
}

export interface MessageBase {
  uid: string;
  chatId: string;
  messageType: MessageType;
  timestamp: UnifiedTimestamp;
  text: string;
}

export interface UserMessage extends MessageBase {
  messageType: MessageType.UserMessage;

  fromUserId: string;
}

export interface DiscussItemsMessage extends MessageBase {
  messageType: MessageType.DiscussItemsMessage;

  itemPair: ItemPair;
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

export const getDefaultUserMessage = (
  timestamp: UnifiedTimestamp
): UserMessage => ({
  uid: uniqueId("message"),
  chatId: "",
  messageType: MessageType.UserMessage,
  timestamp,
  fromUserId: "",
  text: "fakeMessage",
});

export const getDefaultMediatorMessage = (
  timestamp: UnifiedTimestamp
): MediatorMessage => ({
  uid: uniqueId("message"),
  chatId: "",
  messageType: MessageType.MediatorMessage,
  timestamp,
  text: "fakeMessage",
});
