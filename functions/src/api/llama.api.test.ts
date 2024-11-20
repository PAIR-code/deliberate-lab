import { OllamaChat } from "./llama.api";

/**
 * Test assumes a container with ollama is running on port 11434
 * Download the docker image to run :
 * https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image
 */

const MODEL_TYPE = "llama3.2";
const LLM_SERVER_ENDPOINT = "http://localhost:11434/api/chat";
const TEST_MESSAGE = "Say hello!";

// TODO: use jest describe
test("chat with hosted llm", async () => {
    const client = new OllamaChat(LLM_SERVER_ENDPOINT, MODEL_TYPE)
    const response = await client.chat([TEST_MESSAGE]);
    expect(response.toLowerCase()).toContain("hello");
    console.log(response);
});