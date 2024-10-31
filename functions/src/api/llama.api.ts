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
    prompt: string
}


async function chat(llm_server_endpoint_url: string, message: string, model_type: string): Promise<string> {
    const message_object = encode_message(model_type, message)
    const response = await fetch(llm_server_endpoint_url, { method: "POST", body: JSON.stringify(message_object) })
    const response_message = decode_model_response(response)
    return response_message
}


function encode_message(model_type: string, message: string): OutgoingMessage {
    return { "model": model_type, "prompt": message }
}


async function decode_model_response(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error("Failed to read response body")
    }

    let content = ""
    while(true) {
        // we rely on the "done" property given to us in the response JSON
        // to terminate the loop
        const { done, value } = await reader.read()

        const rawjson = new TextDecoder().decode(value);
        const json: IncomingMessage = JSON.parse(rawjson)

        if (json.done) {
            break
        }
        content += json.response
    } 

    return content
}