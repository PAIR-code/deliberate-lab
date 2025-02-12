import nock = require('nock');

import { ollamaChat } from "./ollama.api";

const MODEL_TYPE = "llama3.2";
const LLM_SERVER_ENDPOINT = "http://localhost:11434/api/chat";
const LLM_SERVER_HOST = "http://localhost:11434";
const LLM_SERVER_PATH = "/api/chat";
const TEST_MESSAGE = "Say hello!";


describe("OllamaChat Client", () => {
  it("should return a response containing 'hello' (case insensitive)", async () => {
    nock(LLM_SERVER_HOST)
      .post(LLM_SERVER_PATH)
      .reply(200, {
        'created_at': Date.now(),
        'model': MODEL_TYPE,
        'message': {
          'role': 'assistant',
          'content': 'Hello!',
        },
        'done': true,
      });
    
    const response = await ollamaChat([TEST_MESSAGE], {url: LLM_SERVER_ENDPOINT, llmType: MODEL_TYPE});
    expect(response.text.toLowerCase()).toContain("hello");
    console.log(response);
    
    nock.cleanAll();
  });
});
