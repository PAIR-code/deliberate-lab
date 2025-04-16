// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {ModelGenerationConfig} from '@deliberation-lab/utils';
import {getOpenAIAPITextCompletionResponse} from './openai.api';
import {ModelResponse} from './model.response';

describe('OpenAI-compatible API', () => {
  it('handles chat completion request', async () => {
    nock('https://test.uri')
      .post('/v1/chat/completions', body => body.model == 'test-model')
      .reply(200, {
        id: 'test-id',
        object: 'text_completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            text: 'test output',
            index: 0,
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
      });

    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'foo', value: 'bar'}],
    };

    const response: ModelResponse = await getOpenAIAPIChatCompletionResponse(
      'testapikey',
      'https://test.uri/v1/',
      'test-model',
      'This is a test prompt.',
      generationConfig,
    );

    expect(response.text).toEqual('test output');

    nock.cleanAll();
  });
});
