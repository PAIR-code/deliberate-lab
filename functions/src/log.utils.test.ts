import {
  initializeTestEnvironment,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import nock from 'nock';
import {
  ModelGenerationConfig,
  ModelLogEntry,
  StructuredOutputDataType,
  StructuredOutputType,
  createModelLogEntry,
} from '@deliberation-lab/utils';
import { writeModelLogEntry } from './log.utils';
import { getGeminiAPIResponse } from './api/gemini.api';

const MODEL_NAME = 'gemini-2.5-flash';

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

var mockFirestore;

jest.mock('./app', () => ({
  app: {
    firestore: () => { return mockFirestore; },
  },
}));

describe('log.utils', () => {
  let testEnv: rulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'deliberate-lab-test',
      firestore: {
        rules: RULES,
        host: 'localhost',
        port: 8080,
      },
    });
    mockFirestore = testEnv.unauthenticatedContext().firestore();
    mockFirestore.settings({ ignoreUndefinedProperties: true, merge: true });
  });

  afterAll(async () => {
    nock.cleanAll();
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should write a model log entry from a json_schema API response to Firestore', async () => {
    const experimentId = 'test-experiment';
    const logId = 'test-log';

    nock('https://generativelanguage.googleapis.com')
      .post(`/v1beta/models/${MODEL_NAME}:generateContent`)
      .reply(200, (uri, requestBody) => {
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      output: 'test output',
                    }),
                  },
                ],
              },
            },
          ],
        };
      });

    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.4,
      topP: 0.9,
      customRequestBodyFields: [],
    };

    const structuredOutputConfig = {
      type: StructuredOutputType.JSON_SCHEMA,
      schema: {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          {
            name: 'stringProperty',
            schema: {
              type: StructuredOutputDataType.STRING,
              description: 'description',
            },
          },
        ],
      },
    };

    const response = await getGeminiAPIResponse(
      'testapikey',
      MODEL_NAME,
      'This is a test prompt.',
      generationConfig,
      structuredOutputConfig,
    );

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

    const logDocRef = await mockFirestore
      .collection('experiments')
      .doc(experimentId)
      .collection('logs')
      .doc(logId);

    const logDoc = await assertSucceeds(logDocRef.get());
    const data = logDoc.data();
    expect(data).toBeDefined();
    expect(data!.response.generationConfig).toBeDefined();
    expect(data!.response.generationConfig.responseSchema).toBeDefined();
    expect(
      data!.response.generationConfig.responseSchema.properties.stringProperty,
    ).toBeDefined();
  });
});
