/** Chat between participants and mediators */

import { uniqueId } from '../utils/algebraic.utils';
import { Item, ItemName } from './items.types';
import { Message } from './messages.types';

export enum ChatKind {
  ChatAboutItems = 'chatAboutItems',
}

// TODO : mettre des types de configs pour les chats aussi !
// en vrai ça va être très stylé, je pense qu'avec cette structure on devrait pouvoir avancer très vite !
// comment on stocke cette config ?

export interface BaseChat {
  chatId: string;
  messages: Message[];
}

export interface ChatAboutItems extends BaseChat {
  ratingsToDiscuss: { id1: number; id2: number }[]; // Item index pairs that will be discussed
  items: Item[];
  // TODO(cjqian): This needs to be a per-participant value.
  isSilent: boolean; // What does this mean ? Is it a muting option for mediators ?
}

/** Isolated document data to synchronize participants willing to end the chat using firestore subscriptions */
export interface ReadyToEndChat {
  chatId: string;
  readyToEndChat: Record<string, boolean>;
  currentPair: number; // Index of the current pair being discussed. If >= ratingsToDiscuss.length, the chat is over.
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
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultChatAboutItemsConfig = (): ChatAboutItems => {
  return {
    chatId: uniqueId('chat'),
    ratingsToDiscuss: [],
    items: [],
    messages: [],
    isSilent: true,
  };
};
