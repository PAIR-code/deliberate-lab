import { FirebaseOptions } from "firebase/app";

import { ExperimentStage, StageType } from "./types";

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

/** Temporary experiment example. */
export const EXPERIMENT_EXAMPLE_STAGES: ExperimentStage[] = [
  {
    id: "terms-of-service",
    name: "Terms of Service",
    type: StageType.INFO,
    content: "Placeholder terms of service",
    acknowledgment: true,
  },
  {
    id: "intro",
    name: "Introduction",
    type: StageType.INFO,
    content: "Placeholder introduction to experiment",
    acknowledgment: false,
  },
  {
    id: "chat",
    name: "Group chat",
    type: StageType.CHAT,
    profiles: [
      {
        id: 'participant-a',
        name: 'Participant A',
        pronouns: 'they/them',
        avatar: '',
      },
      {
        id: 'participant-b',
        name: 'Participant B',
        pronouns: 'he/him',
        avatar: '',
      },
      {
        id: 'participant-c',
        name: 'Participant B',
        pronouns: 'she/her',
        avatar: '',
      }
    ],
    messages: [
      {
        id: '1',
        author: 'participant-a',
        content: 'Hello world',
      },
      {
        id: '2',
        author: 'participant-b',
        content: 'Vitae aut quibusdam sequi. Voluptatem molestias dolor distinctio reprehenderit. Natus dolores commodi minus iusto est qui. Voluptate aut non temporibus velit vero at.',
      },
      {
        id: '3',
        author: 'participant-c',
        content: 'Facilis voluptatibus modi provident aspernatur',
      }
    ]
  }
];
