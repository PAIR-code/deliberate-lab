/**
 * Code assumes that the LLaMa instance is hosted on the provided IP address,
 * and is managed through the `ollama` framework (https://github.com/ollama/ollama).
 * Ideally, the code should accomodate multiple frameworks in the end.
 */

type IncomingMessage = {
    model: string,
    created_at: Date,
    response: string,
    done: boolean
}

type OutgoingMessage = {
    model: string,
    prompt: string,
    stream: boolean
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

    public async chat(message: string): Promise<string> {
        const message_object = this.encodeMessage(message);
        const response = await fetch(this.server_endpoint_url, { method: "POST", body: JSON.stringify(message_object) });
        const response_message = this.decodeResponse(response);
        return response_message;
    }

    private async decodeResponse(response: Response): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to read response body");
        }

        const { done, value } = await reader.read();
        const rawjson = new TextDecoder().decode(value);
        console.log("Received: ", rawjson)
        if (this.isError(rawjson)) {
            console.log(rawjson)
            return ""
        } else {
            const json: IncomingMessage = JSON.parse(rawjson);
            console.log("Received: ", json.response)
            return json.response;
        }
    }

    private encodeMessage(message: string): OutgoingMessage {
        return { "model": this.model_type, "prompt": message, "stream": false }
    }

    private isError(rawjson: string): boolean {
        return rawjson.startsWith('{"error"');
    }

}