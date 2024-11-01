/**
 * Code assumes that the LLaMa instance is hosted on the provided IP address,
 * and is managed through the `ollama` framework (https://github.com/ollama/ollama).
 * Ideally, the code should accomodate multiple frameworks in the end.
 * 
 * Note: there already exists a client library for JavaScript, but not for Typescript.
 */

type IncomingMessage = {
    model: string,
    created_at: Date,
    message: LlmMessage,
    done_reason: string,
    done: boolean
}

type OutgoingMessage = {
    model: string,
    messages: LlmMessage[],
    stream: boolean
}

type LlmMessage = {
    role: string,
    content: string
}


export class OllamaChat {
    private readonly server_endpoint_url: string;
    private readonly model_type: string
    private isInitalized: boolean;

    public constructor(server_endpoint_url: string, model_type: string) {
        this.server_endpoint_url = server_endpoint_url;
        this.model_type = model_type;
        this.isInitalized = false;
    }

    public async chat(messages: string[]): Promise<string> {
        if (!this.isInitalized) {
            await this.initializeLLM();
            this.isInitalized = true;
        }
        return await this.sendMessage(messages);
    }

    private initializeLLM(): void {
        this.sendMessage([])
    }

    private async sendMessage(messages: string[]): Promise<string> {
        const message_objects = this.encodeMessages(messages);
        console.log("Sending prompt:", message_objects)
        const response = await fetch(this.server_endpoint_url, { method: "POST", body: JSON.stringify(message_objects) });
        const response_message = await this.decodeResponse(response);
        console.log("Received response: ", response_message);
        return response_message;
    }

    private async decodeResponse(response: Response): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to read response body");
        }

        const { done, value } = await reader.read();
        const rawjson = new TextDecoder().decode(value);
        console.log("Received raw: ", rawjson)
        if (this.isError(rawjson)) {
            console.log("Error:", rawjson)
            return ""
        } else {
            const json: IncomingMessage = JSON.parse(rawjson);
            return json.message.content;
        }
    }

    private encodeMessages(messages: string[]): OutgoingMessage {
        const message_objs: LlmMessage[] = messages.map((message) => ({ role: "user", content: message }));
        return {
            model: this.model_type,
            messages: message_objs,
            stream: false
        };
    }

    private isError(rawjson: string): boolean {
        return rawjson.startsWith('{"error"');
    }

}