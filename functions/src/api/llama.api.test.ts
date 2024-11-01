import { _testPrivate, llamaChat } from "./llama.api";

/**
 * Test assumes a container with ollama is running on port 11434
 * Download the docker image to run :
 * https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image
 */

const MODEL_TYPE = "llama3.2"
const LLM_SERVER_ENDPOINT = "http://localhost:11434/api/chat"
const TEST_MESSAGE = "Say the following phrase: 'The test succedeed'";


test("encode message", () => {
    const encoded_message = _testPrivate.encodeMessage(MODEL_TYPE, TEST_MESSAGE);
    expect(encoded_message.model).toBe(MODEL_TYPE);
    expect(encoded_message.prompt).toBe(TEST_MESSAGE);
});


test("chat with hosted llm", async () => {
    const response = await llamaChat(LLM_SERVER_ENDPOINT, TEST_MESSAGE, MODEL_TYPE);
    expect(response).toContain("test");
    console.log(response);
});