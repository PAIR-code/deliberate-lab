/** Chat between participants and mediators */

import { ItemName } from './lost_at_sea.types';

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