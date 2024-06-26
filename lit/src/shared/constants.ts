/** Firebase constants. */
export const FIREBASE_LOCAL_HOST_PORT_FIRESTORE = 8080;
export const FIREBASE_LOCAL_HOST_PORT_AUTH = 9099;
export const FIREBASE_LOCAL_HOST_PORT_FUNCTIONS = 5001;

/** Stage config descriptions. */
export const STAGE_DESCRIPTION_INFO = "Shows Markdown-rendered information";
export const STAGE_DESCRIPTION_TOS = "Shows Markdown-rendered terms of service";
export const STAGE_DESCRIPTION_SURVEY =
  "Answer questions on a sliding scale of 1 to 10";
export const STAGE_DESCRIPTION_PROFILE =
  "Set profile name and other details";
export const STAGE_DESCRIPTION_CHAT = "Chat with other participants";
export const STAGE_DESCRIPTION_CHAT_SIMPLE = "This is a simple chat (no discussion topics)";
export const STAGE_DESCRIPTION_VOTE = "Choose a participant leader";
export const STAGE_DESCRIPTION_REVEAL = "Show leader voting results";

export const MODULE_DESCRIPTION_LAS =
  "Includes one pairwise Lost at Sea task, a chat, another pairwise task, and a final leader task";
export const MODULE_DESCRIPTION_LEADER =
  "Includes voting stage and reveal stage for choosing a participant leader";

/** Profile avatars. */
export const PROFILE_AVATARS = [
  '👩🏻','👩🏼','👩🏽','👩🏾','👩🏿',
  '👨🏻','👨🏼','👨🏽','👨🏾','👨🏿',
  '🧑🏻','🧑🏼','🧑🏽','🧑🏾','🧑🏿'
];

/** LLM mediator avatars. */
export const LLM_MEDIATOR_AVATARS = ['🤖', '🙋', '👋', '💡', '⭐'];