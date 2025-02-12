import nock = require('nock');

import { AgentGenerationConfig } from '@deliberation-lab/utils';
import { getOpenAIAPITextCompletionResponse } from './openai.api';
import { ModelResponse } from './model.response';


describe('OpenAI-compatible API', () => {
  it('handles text completion request', async () => {
    nock('https://test.uri')
      .post('/v1/completions', body => body.model == 'test-model')
      .reply(200, {
        'id': 'test-id',
        'object': 'text_completion',
        'created': Date.now(),
        'model': 'test-model',
        'choices': [
          {
            'text': 'test output',
            'index': 0,
            'logprobs': null,
            'finish_reason': 'stop',
          }
        ],
      });

    const generationConfig: AgentGenerationConfig = {
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [ {name: 'foo', value: 'bar'} ]
    };

    const response: ModelResponse = await getOpenAIAPITextCompletionResponse(
      'testapikey',
      'https://test.uri/v1/',
      'test-model',
      'This is a test prompt.',
      generationConfig
    );

    expect(response.text).toEqual('test output');

    nock.cleanAll();
  });
});
