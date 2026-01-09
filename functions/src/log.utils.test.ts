// This test assumes that a Firestore emulator is running, either at the port
// specified by the FIRESTORE_EMULATOR_HOST environment variable, or at 8080 if
// not specified. npm test is configured to set up a temporary emulator to run
// the test. To do it yourself, run e.g.:
//
// firebase emulators:exec --only firestore "npx jest src/log.utils.test.ts"

import {
  initializeTestEnvironment,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  ModelLogEntry,
  ModelResponse,
  ModelResponseStatus,
  createModelLogEntry,
} from '@deliberation-lab/utils';
import {writeModelLogEntry} from './log.utils';

const RULES = `
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /{document=**} {
allow read, write: if true;
}
}
}
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFirestore: any;

jest.mock('./app', () => ({
  app: {
    firestore: () => {
      return mockFirestore;
    },
  },
}));

describe('log.utils', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'deliberate-lab-test',
      firestore: {
        rules: RULES,
        ...(!process.env.FIRESTORE_EMULATOR_HOST && {
          host: 'localhost',
          port: 8081,
        }),
      },
    });
    mockFirestore = testEnv.unauthenticatedContext().firestore();
    mockFirestore.settings({ignoreUndefinedProperties: true, merge: true});
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should write a model log entry to Firestore', async () => {
    const experimentId = 'test-experiment';
    const logId = 'test-log';

    // Create a mock ModelResponse for testing log writing
    const response: ModelResponse = {
      status: ModelResponseStatus.OK,
      text: JSON.stringify({output: 'test output'}),
      parsedResponse: {output: 'test output'},
      generationConfig: {
        maxTokens: 300,
        temperature: 0.4,
      },
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    const logEntry: ModelLogEntry = createModelLogEntry({
      id: logId,
      experimentId,
      response,
      // pass a Date() to work around firebase-functions-test timestamp
      // incompatibility:
      // https://github.com/firebase/firebase-js-sdk/issues/6077
      createdTimestamp: new Date(),
    });

    await writeModelLogEntry(experimentId, logEntry);

    const logDocRef = mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('logs')
      .doc(logId);

    const logDoc = await assertSucceeds(logDocRef.get());
    const data = logDoc.data();
    expect(data).toBeDefined();
    expect(data!.response.status).toBe(ModelResponseStatus.OK);
    expect(data!.response.text).toBeDefined();
    expect(data!.response.parsedResponse).toBeDefined();
    expect(data!.response.usage).toBeDefined();
    expect(data!.response.usage.totalTokens).toBe(30);
  });
});
