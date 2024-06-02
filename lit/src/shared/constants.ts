import { FirebaseOptions } from "firebase/app";

/** Firebase constants. */
export const FIREBASE_LOCAL_HOST_PORT_FIRESTORE = 8080;
export const FIREBASE_LOCAL_HOST_PORT_AUTH = 9099;
export const FIREBASE_LOCAL_HOST_PORT_FUNCTIONS = 5001;

export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'your-api-key',
  authDomain: 'your-auth-domain',
  projectId: 'your-project-id',
  storageBucket: 'your-storage-bucket',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
};

/** Stage config descriptions. */
export const STAGE_DESCRIPTION_INFO = "Shows Markdown-rendered information";
export const STAGE_DESCRIPTION_TOS = "Shows Markdown-rendered terms of service";