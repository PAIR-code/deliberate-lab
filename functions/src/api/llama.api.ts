/**
 * Client handling communications with an Ollama server.
 * 
 * Code assumes that the LLaMa instance is hosted on the provided IP address,
 * and is managed through the `ollama` framework (https://github.com/ollama/ollama).
 * Ideally, the code should accommodate multiple frameworks in the end.
 * 
 * Note: there already exists a client library for JavaScript, but not for Typescript.
 */

import { LlamaServerConfig } from "@deliberation-lab/utils"


/**
 * The JSON schema of Ollama LLM responses.
 */
type IncomingMessage = {
    model: string,
    createdAt: Date,
    message: LlmMessage,
    doneReason: string,
    done: boolean
}

/**
 * The JSON schema for LLM input understood by Ollama.
 */
type OutgoingMessage = {
    model: string,
    messages: LlmMessage[],
    stream: boolean
}

/**
 * The JSON schema for LLM prompts enforced by the Ollama Chat API.
 */
type LlmMessage = {
    role: string,
    content: string
}


/**
 * Send a list of string-messages to the hosted LLM and receive its response.
 *
 * @param messages a list of string-messages to be sent as prompts to the model
 * @param llmType the type of llm running in the server (e.g. "llama3.2"). 
 * Keep in mind that the model must have been loaded server-side in order to be used.
 * @param serverConfig the url and other necessary data of the Ollama server
 * @returns the model's response as a string, or empty string if an error occured
 */
export async function ollamaChat(messages: string[], 
                                llmType: string, 
                                serverConfig: LlamaServerConfig)
                                : Promise<ModelResponse> {
    const messageObjects = encodeMessages(messages, llmType);

    console.log("Sending prompt:", messageObjects);
    const response = await fetch(serverConfig.url, { method: "POST", body: JSON.stringify(messageObjects) });

    const responseMessage = await decodeResponse(response);
    console.log("Received response: ", responseMessage);

    return { text: responseMessage };
}

/**
 * Extract the REST API response of the model into a string.
 * @param response the LLM's REST response
 * @returns a string representing the model's response
 */
async function decodeResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Failed to read response body");
    }

    const { done, value } = await reader.read();
    const rawjson = new TextDecoder().decode(value);
    console.log("Received raw: ", rawjson)

    if (isError(rawjson)) {
        // this should probably throw an Error, but Gemini's API just logs it
        console.log("Error:", rawjson)
        return ""
    } else {
        const json: IncomingMessage = JSON.parse(rawjson);
        return json.message.content;
    }
}

/**
 * Transform string-messages to JSON objects appropriate for the model's API. 
 * @param messages a list of string-messages to be sent to the LLM
 * @param modelType the type of llm running in the server (e.g. "llama3.2"). 
 * Keep in mind that the model must have been loaded server-side in order to be used.
 * @returns appropriate JSON objects which the model can understand
 */
function encodeMessages(messages: string[], modelType: string): OutgoingMessage {
    const message_objs: LlmMessage[] = messages.map((message) => ({ role: "user", content: message }));
    return {
        model: modelType,
        messages: message_objs,
        stream: false
    };
}

/**
 * Check whether the model's response indicates an error.
 * This is necessary since the REST API does not respond with standard error headers.
 * @param rawjson the raw response of the model
 * @returns true if the response indicates an error
 */
function isError(rawjson: string): boolean {
    return rawjson.startsWith('{"error"');
}
