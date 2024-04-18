/** Chat between participants and mediators */

import { uniqueId } from 'lodash';
import { Item } from './items.types';
import { Message } from './messages.types';

export interface BaseChat {
  chatId: string;
  messages: Message[];
}

export interface ChatAboutItems extends BaseChat {
  ratingsToDiscuss: [number, number][]; // Item index pairs that will be discussed
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
