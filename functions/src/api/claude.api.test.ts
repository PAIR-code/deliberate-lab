// claude.api.test.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {
  ModelGenerationConfig,
  ModelResponse,
  ModelResponseStatus,
} from '@deliberation-lab/utils';
import {getClaudeAPIChatCompletionResponse} from './claude.api';

const MODEL_NAME = 'claude-3-5-haiku-latest';
const CLAUDE_API_HOST = 'https://api.anthropic.com';
const CLAUDE_API_PATH = '/v1/messages';

describe('Claude API', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('handles text completion request', async () => {
    nock(CLAUDE_API_HOST)
      .post(CLAUDE_API_PATH)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reply(200, (uri, requestBody: any) => {
        return {
          id: 'msg_mock_12345',
          type: 'message',
          role: 'assistant',
          model: MODEL_NAME,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                output: 'test output',
                temperature: requestBody.temperature,
                top_p: requestBody.top_p,
              }),
            },
          ],
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 25,
          },
        };
      });

    const generationConfig: ModelGenerationConfig = {
      maxTokens: 300,
      stopSequences: [],
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [],
    };

    const response: ModelResponse = await getClaudeAPIChatCompletionResponse(
      'test-api-key',
      MODEL_NAME,
      'This is a test prompt.',
      generationConfig,
    );

    expect(response.status).toBe(ModelResponseStatus.OK);
    expect(response.text).toBeDefined();
    expect(response.text).toContain('test output');
    expect(response.text).toContain('"temperature":0.4');
    expect(response.text).toContain('"top_p":0.9');
  });
});
