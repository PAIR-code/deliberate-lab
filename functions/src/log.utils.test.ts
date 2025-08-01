import * as admin from 'firebase-admin';
import firebaseFunctionsTest from 'firebase-functions-test';
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

const testEnv = firebaseFunctionsTest();

jest.mock('./app', () => ({
  app: {
    firestore: () => {
      const admin = require('firebase-admin');
      return admin.firestore();
    },
  },
}));

describe('log.utils', () => {
  let firestore: admin.firestore.Firestore;

  beforeAll(() => {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: 'test-project',
      });
    }
    firestore = admin.firestore();
    firestore.settings({
      host: 'localhost:8080',
      ssl: false,
      ignoreUndefinedProperties: true,
    });
  });

  afterAll(async () => {
    nock.cleanAll();
    await firestore.terminate();
    await Promise.all(admin.apps.map(app => app?.delete()));
    testEnv.cleanup();
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
      createdTimestamp: admin.firestore.Timestamp.now(),
    });

    await writeModelLogEntry(experimentId, logEntry);

    const logDoc = await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('logs')
      .doc(logId)
      .get();

    const data = logDoc.data();
    expect(data).toBeDefined();
    expect(data!.response.generationConfig).toBeDefined();
    expect(data!.response.generationConfig.responseSchema).toBeDefined();
    expect(
      data!.response.generationConfig.responseSchema.properties.stringProperty,
    ).toBeDefined();
  });
});
