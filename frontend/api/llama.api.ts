/**
 * Code assumes that the LLaMa instance is hosted on the provided IP address,
 * and is managed through the `ollama` framework (https://github.com/ollama/ollama).
 * Ideally, the code should accomodate multiple frameworks in the end.
 * 
 * Note: there already exists a client library for JavaScript, but not for Typescript.
 */

/**
 * The JSON schema of Ollama LLM responses.
 */
type IncomingMessage = {
    model: string,
    created_at: Date,
    message: LlmMessage,
    done_reason: string,
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
 * A client handling communications with an Ollama server.
 */
export class OllamaChat {
    private readonly server_endpoint_url: string;
    private readonly model_type: string
    private isInitalized: boolean;

    /**
     * Initalize the ollama client.
     * @param server_endpoint_url the http URL of the server hosting the LLM
     * @param model_type the type of the model which will generate the responses
     */
    public constructor(server_endpoint_url: string, model_type: string) {
        this.server_endpoint_url = server_endpoint_url;
        this.model_type = model_type;
        this.isInitalized = false;
    }

    /**
     * Send a list of string-messages to the hosted LLM and receive its response.
     *
     * @param messages a list of string-messages to be sent as prompts to the model
     * @returns the model's response as a string, or empty string if an error occured
     * @example
     * ```
     * messages = ["Previous chat history:", "Hello, how are you?",
     * "Hello, I'm fine, how can I help you?", 
     * "Generate python code that converts a list of integers to strings"];
     * res = await client.chat(messages);
     * console.log(res);
     * ```
     */
    public async chat(messages: string[]): Promise<string> {
        if (!this.isInitalized) {
            await this.initializeLLM();
            this.isInitalized = true;
        }
        return await this.sendMessage(messages);
    }

    /**
     * Initialize the underlying model.
     * @see https://github.com/ollama/ollama/blob/main/docs/api.md
     * "If an empty prompt is provided, the model will be loaded into memory."
     */
    private initializeLLM(): void {
        // should this be executed at instance-construction time?
        this.sendMessage([])
    }

    /**
     * Send a message to the LLM and receive its response.
     * @param messages a list of string-messages to be sent
     * @returns the LLM's response as a string
     */
    private async sendMessage(messages: string[]): Promise<string> {
        const message_objects = this.encodeMessages(messages);

        console.log("Sending prompt:", message_objects)
        const response = await fetch(this.server_endpoint_url, { method: "POST", body: JSON.stringify(message_objects) });

        const response_message = await this.decodeResponse(response);
        console.log("Received response: ", response_message);

        return response_message;
    }

    /**
     * Extract the REST API response of the model into a string.
     * @param response the LLM's REST response
     * @returns a string representing the model's response
     */
    private async decodeResponse(response: Response): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to read response body");
        }

        const { done, value } = await reader.read();
        const rawjson = new TextDecoder().decode(value);
        console.log("Received raw: ", rawjson)

        if (this.isError(rawjson)) {
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
     * @returns appropriate JSON objects which the model can understand
     */
    private encodeMessages(messages: string[]): OutgoingMessage {
        const message_objs: LlmMessage[] = messages.map((message) => ({ role: "user", content: message }));
        return {
            model: this.model_type,
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
    private isError(rawjson: string): boolean {
        return rawjson.startsWith('{"error"');
    }

}