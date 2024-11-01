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


export async function llamaChat(llm_server_endpoint_url: string, message: string, model_type: string): Promise<string> {
    const message_object = encodeMessage(model_type, message);
    const response = await fetch(llm_server_endpoint_url, { method: "POST", body: JSON.stringify(message_object) });
    const response_message = decodeResponse(response);
    return response_message;
}


function encodeMessage(model_type: string, message: string): OutgoingMessage {
    return { "model": model_type, "prompt": message , "stream": false}
}

function isError(rawjson: string): boolean {
    return rawjson.startsWith('{"error"');
}


async function decodeResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Failed to read response body");
    }

    const { done, value } = await reader.read();
    const rawjson = new TextDecoder().decode(value);
    console.log("Received: ", rawjson)
    if(isError(rawjson)) {
        console.log(rawjson)
        return ""
    } else {
        const json: IncomingMessage = JSON.parse(rawjson);
        console.log("Received: ", json.response)
        return json.response;
    }
}

// hacky way to expose test functions without breaking encapsulation
// I haven't found a better way to achieve this
// https://stackoverflow.com/questions/31922977/testing-typescript-function-which-is-not-exported
export const _testPrivate = {
    encodeMessage,
};