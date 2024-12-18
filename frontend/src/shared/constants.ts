/** Prolific URL prefix. */
export const PROLIFIC_COMPLETION_URL_PREFIX = 'https://app.prolific.com/submissions/complete?cc='

/** Firebase constants. */
export const FIREBASE_LOCAL_HOST_PORT_FIRESTORE = 8080;
export const FIREBASE_LOCAL_HOST_PORT_STORAGE = 9199;
export const FIREBASE_LOCAL_HOST_PORT_AUTH = 9099;
export const FIREBASE_LOCAL_HOST_PORT_FUNCTIONS = 5001;

/** App name. */
export const APP_NAME = "Deliberate Lab";

/** Profile avatars. */
export const MAN_EMOJIS = ['👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'];
export const WOMAN_EMOJIS = ['👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'];
export const PERSON_EMOJIS = ['🧑🏻', '🧑🏼', '🧑🏽', '🧑🏾', '🧑🏿'];

export const PROFILE_AVATARS = [
  ...WOMAN_EMOJIS,
  ...MAN_EMOJIS,
  ...PERSON_EMOJIS
];

/** LLM agent avatars. */
export const LLM_AGENT_AVATARS = ['🤖', '🙋', '👋', '💡', '⭐'];