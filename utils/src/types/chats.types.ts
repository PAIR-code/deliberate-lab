/** Chat between participants and mediators */

import { ItemName } from './items.types';

export enum ChatKind {
  ChatAboutItems = 'chatAboutItems',
}

// ********************************************************************************************* //
//                                            CONFIGS                                            //
// ********************************************************************************************* //

interface BaseChatConfig {
  kind: ChatKind;
}

export interface ChatAboutItemsConfig extends BaseChatConfig {
  kind: ChatKind.ChatAboutItems;

  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[];
}

export type ChatConfig = ChatAboutItemsConfig;

// ********************************************************************************************* //
//                                            ANSWERS                                            //
// ********************************************************************************************* //

/** Per-participant chat config (stored in the participant chat document and not the chat stage answers) */
export interface ChatAnswer {
  readyToEndChat: boolean;

  // Indexes (facilitate automated actions)
  participantPublicId: string;
  stageName: string;
}

// ********************************************************************************************* //
//                                         PUBLIC DATA                                           //
// ********************************************************************************************* //

interface BaseChatPublicData {
  kind: ChatKind;
}

export interface PublicChatAboutItemsData extends BaseChatPublicData {
  kind: ChatKind.ChatAboutItems;

  ratingsToDiscuss: { item1: ItemName; item2: ItemName }[]; // Repeat this here for convenience in triggers
  currentRatingIndex: number;
}

export type PublicChatData = PublicChatAboutItemsData;

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultChatAboutItemsConfig = (): ChatAboutItemsConfig => {
  return {
    kind: ChatKind.ChatAboutItems,
    ratingsToDiscuss: [],
  };
};
