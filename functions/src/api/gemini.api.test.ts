// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {
  ModelGenerationConfig,
  ModelResponse,
  ModelResponseStatus,
  StructuredOutputType,
  StructuredOutputDataType,
} from '@deliberation-lab/utils';
import {getGeminiAPIResponse} from './gemini.api';

const MODEL_NAME = 'gemini-2.5-flash';

describe('Gemini API', () => {
  let scope: nock.Scope;

  beforeEach(() => {
    scope = nock('https://generativelanguage.googleapis.com')
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
                      generationConfig: requestBody.generationConfig,
                    }),
                  },
                ],
              },
              index: 0,
              finish_reason: 'STOP',
              avgLogprobs: -0.1,
            },
          ],
          modelVersion: MODEL_NAME,
        };
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('handles text completion request', async () => {
    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'seed', value: 123}],
    };

    const response: ModelResponse = await getGeminiAPIResponse(
      'testapikey',
      MODEL_NAME,
      'This is a test prompt.',
      generationConfig,
    );

    expect(response.text).toContain('test output');
    expect(response.text).toContain('"temperature":0.4');
    expect(response.text).toContain('"topP":0.9');
  });

  it('handles structured output config', async () => {
    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'seed', value: 123}],
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
              description: 'A string-valued property',
            },
          },
          {
            name: 'integerProperty',
            schema: {
              type: StructuredOutputDataType.INTEGER,
              description: 'An integer-valued property',
            },
          },
          {
            name: 'enumProperty',
            schema: {
              type: StructuredOutputDataType.ENUM,
              description: 'An enum-valued property',
              enumItems: ['FOO', 'BAR', 'BAZ'],
            },
          },
        ],
      },
    };

    const response: ModelResponse = await getGeminiAPIResponse(
      'testapikey',
      MODEL_NAME,
      'This is a test prompt.',
      generationConfig,
      structuredOutputConfig,
    );

    const parsedResponse = JSON.parse(response.text);
    const expectedResponse = {
      output: 'test output',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            stringProperty: {
              type: 'STRING',
              description: 'A string-valued property',
            },
            integerProperty: {
              type: 'INTEGER',
              description: 'An integer-valued property',
            },
            enumProperty: {
              type: 'STRING',
              description: 'An enum-valued property',
              enum: ['FOO', 'BAR', 'BAZ'],
            },
          },
          propertyOrdering: [
            'stringProperty',
            'integerProperty',
            'enumProperty',
          ],
          required: ['stringProperty', 'integerProperty', 'enumProperty'],
        },
      },
    };
    expect(parsedResponse).toMatchObject(expectedResponse);
  });

  it('handles a 503 error from the server', async () => {
    nock.cleanAll();
    nock('https://generativelanguage.googleapis.com')
      .post(`/v1beta/models/${MODEL_NAME}:generateContent`)
      .reply(503, 'Service Unavailable');

    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'seed', value: 123}],
    };

    const response: ModelResponse = await getGeminiAPIResponse(
      'testapikey',
      MODEL_NAME,
      'This is a test prompt.',
      generationConfig,
    );

    expect(response.status).toBe(
      ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR,
    );
    expect(response.errorMessage).toContain('Service Unavailable');
  });
});
