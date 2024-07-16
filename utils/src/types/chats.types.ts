/** Chat between participants and mediators */

import { ItemName } from './items.types';

export enum ChatKind {
  SimpleChat = 'simpleChat',
  ChatAboutItems = 'chatAboutItems',
}

// ********************************************************************************************* //
//                                            CONFIGS                                            //
// ********************************************************************************************* //

interface BaseChatConfig {
  kind: ChatKind;
}

export interface SimpleChatConfig extends BaseChatConfig {
  kind: ChatKind.SimpleChat;
}

export interface ChatAboutItemsConfig extends BaseChatConfig {
  kind: ChatKind.ChatAboutItems;

  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[];
}

export type ChatConfig = SimpleChatConfig | ChatAboutItemsConfig;

// ********************************************************************************************* //
//                                            ANSWERS                                            //
// ********************************************************************************************* //

/** Per-participant chat config (stored in the participant chat document and not the chat stage answers) */
export interface ChatAnswer {
  readyToEndChat: boolean;

  // Indexes (facilitate automated actions)
  participantPublicId: string;
  stageId: string;
}

// ********************************************************************************************* //
//                                         PUBLIC DATA                                           //
// ********************************************************************************************* //

interface BaseChatPublicData {
  kind: ChatKind;
}

export interface PublicSimpleChatData extends BaseChatPublicData {
  kind: ChatKind.SimpleChat;
}

export interface PublicChatAboutItemsData extends BaseChatPublicData {
  kind: ChatKind.ChatAboutItems;

  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[]; // Repeat this here for convenience in triggers
  currentRatingIndex: number;
}

export type PublicChatData = PublicSimpleChatData | PublicChatAboutItemsData;