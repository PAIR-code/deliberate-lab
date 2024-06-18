import {FirebaseOptions} from 'firebase/app';

export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'your-api-key',
  authDomain: 'your-auth-domain',
  projectId: 'your-project-id',
  storageBucket: 'your-storage-bucket',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
};

export const LLM_CONFIG = {
  apiKey: 'your-api-key',
  modelName: 'gemini-pro',
  maxTokens: 300,
};