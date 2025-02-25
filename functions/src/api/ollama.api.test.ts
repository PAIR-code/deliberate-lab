// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');

import {ollamaChat} from './ollama.api';
import { AgentGenerationConfig } from '@deliberation-lab/utils';

const MODEL_NAME = 'llama3.2';
const LLM_SERVER_ENDPOINT = 'http://localhost:11434/api/chat';
const LLM_SERVER_HOST = 'http://localhost:11434';
const LLM_SERVER_PATH = '/api/chat';
const TEST_MESSAGE = 'Say hello!';

describe('OllamaChat Client', () => {
  beforeEach(() => {
    nock(LLM_SERVER_HOST)
      .post(LLM_SERVER_PATH, body => body.model == MODEL_NAME)
      .reply(200, (uri, requestBody) => {
        return {
          'created_at': Date.now(),
          'model': MODEL_NAME,
          'message': {
            'role': 'assistant',
            'content': `Hello! request body: ${requestBody}`,
          },
          done: true,
        };
      });
  });
  
  afterEach(() => {
    nock.cleanAll();
  });

  it("should return a response containing 'hello' (case insensitive)", async () => {
    const generationConfig: AgentGenerationConfig = {
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [],
    };
    
    const response = await ollamaChat(
      [TEST_MESSAGE],
      MODEL_NAME,
      {url: LLM_SERVER_ENDPOINT},
      generationConfig
    );
    expect(response.text.toLowerCase()).toContain('hello');
    console.log(response);
  });

  it("should pass through generation config", async () => {
    const generationConfig: AgentGenerationConfig = {
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      customRequestBodyFields: [{name: 'foo', value: 'bar'}],
    };
    
    const response = await ollamaChat(
      [TEST_MESSAGE],
      MODEL_NAME,
      {url: LLM_SERVER_ENDPOINT},
      generationConfig
    );
    expect(response.text.toLowerCase()).toContain('hello');
    expect(response.text.toLowerCase()).toContain('"temperature":0.4');
    expect(response.text.toLowerCase()).toContain('"top_p":0.9');
    expect(response.text.toLowerCase()).toContain('"foo":"bar"');
  });
});
