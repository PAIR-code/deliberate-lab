/** Chat between participants and mediators */

import { uniqueId } from 'lodash';
import { Item, ItemPair } from './items.types';
import { Message } from './messages.types';

export interface BaseChat {
  chatId: string;
  messages: Message[];
}

// TODO: refactor chat structure (the type and name choices seem weird to me)
export interface ChatAboutItems extends BaseChat {
  ratingsToDiscuss: ItemPair[];
  items: Item[];
  readyToEndChat: boolean;
  // TODO(cjqian): This needs to be a per-participant value.
  isSilent: boolean; // What does this mean ? Is it a muting option for mediators ?
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultChatAboutItemsConfig = (): ChatAboutItems => {
  return {
    chatId: uniqueId('chat'),
    ratingsToDiscuss: [],
    messages: [],
    items: [],
    readyToEndChat: false,
    isSilent: true,
  };
};
