// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {AgentGenerationConfig} from '@deliberation-lab/utils';
import {getGeminiAPIResponse} from './gemini.api';
import {ModelResponse} from './model.response';

const MODEL_NAME = 'gemini-1.5-flash';

describe('Gemini API', () => {
  let scope: nock.Scope;

  beforeEach(() => {
    scope = nock('https://generativelanguage.googleapis.com')
      .post(`/v1beta/models/${MODEL_NAME}:generateContent`)
      .reply(200, (uri, requestBody) => {
        return { candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    output: 'test output',
                    generationConfig: requestBody.generationConfig,
                  }),
                }
              ],
            },
            index: 0,
            finish_reason: 'STOP',
            avgLogprobs: -0.1
          },
        ],
        modelVersion: MODEL_NAME
        };
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('handles text completion request', async () => {
    const generationConfig: AgentGenerationConfig = {
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
    const generationConfig: AgentGenerationConfig = {
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'seed', value: 123}],
    };

    const structuredOutputConfig = {
      type: StructuredOutputType.JSON_FORMAT,
      schema: {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          { name: 'stringProperty', schema: { type: StructuredOutputDataType.STRING } },
          { name: 'integerProperty', schema: { type: StructuredOutputDataType.INTEGER } },
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

    expect(response.text).toContain('test output');
    expect(response.text).toContain('"generationConfig":{"temperature":0.4');
  });
});
