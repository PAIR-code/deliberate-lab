// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {ollamaChat} from './ollama.api';

const MODEL_NAME = 'llama3.2';
const LLM_SERVER_ENDPOINT = 'http://localhost:11434/api/chat';
const LLM_SERVER_HOST = 'http://localhost:11434';
const LLM_SERVER_PATH = '/api/chat';
const TEST_MESSAGE = 'Say hello!';

describe('OllamaChat Client', () => {
  it("should return a response containing 'hello' (case insensitive)", async () => {
    nock(LLM_SERVER_HOST)
      .post(LLM_SERVER_PATH, body => body.model == MODEL_NAME)
      .reply(200, {
        'created_at': Date.now(),
        'model': MODEL_NAME,
        'message': {
          'role': 'assistant',
          'content': 'Hello!',
        },
        done: true,
      });

    const response = await ollamaChat(
      [TEST_MESSAGE],
      MODEL_NAME,
      {url: LLM_SERVER_ENDPOINT}
    );
    expect(response.text.toLowerCase()).toContain('hello');
    console.log(response);

    nock.cleanAll();
  });
});
