import { ollamaChat } from "./llama.api";

/**
 * Test assumes a container with ollama is running on port 11434
 * Download the docker image to run :
 * https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image
 */

const MODEL_TYPE = "llama3.2";
const LLM_SERVER_ENDPOINT = "http://localhost:11434/api/chat";
const TEST_MESSAGE = "Say hello!";

describe("OllamaChat Client", () => {
    it("should return a response containing 'hello' (case insensitive)", async () => {
        const response = await ollamaChat([TEST_MESSAGE], MODEL_TYPE, {url: LLM_SERVER_ENDPOINT, port: 80});
        expect(response.text.toLowerCase()).toContain("hello");
        console.log(response);
    });
});