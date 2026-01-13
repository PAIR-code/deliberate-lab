import {
  parseStructuredOutputFromText,
  getStructuredOutput,
  ModelResponse,
  ModelResponseStatus,
} from './model_response';

describe('parseStructuredOutputFromText', () => {
  it('parses valid JSON', () => {
    const input = '{"explanation": "test", "shouldRespond": true}';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('handles markdown code blocks', () => {
    const input =
      '```json\n{"explanation": "test", "shouldRespond": true}\n```';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('handles json prefix without code block', () => {
    const input = 'json\n{"explanation": "test", "shouldRespond": true}';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('extracts response from schema echo (Gemini NDJSON pattern)', () => {
    // Gemini sometimes echoes the JSON schema before the actual response
    const input = `{ "type": "object", "properties": { "explanation": { "description": "I am initiating the discussion by welcoming the participants and introducing the main topic of love stories and tropes in the context of 'Beach Read'.", "type": "string" }, "shouldRespond": { "description": "True if you will send a message, False if you prefer to stay silent.", "type": "boolean" }, "response": { "description": "Your chat message (empty if you prefer to stay silent).", "type": "string" }, "readyToEndChat": { "description": "Whether or not you completed your goals and are ready to end the conversation.", "type": "boolean" } }, "required": [ "explanation", "shouldRespond", "response", "readyToEndChat" ] }

{ "explanation": "I am initiating the discussion by welcoming the participants and introducing the main topic of love stories and tropes in the context of 'Beach Read'.", "shouldRespond": true, "response": "Welcome to the book club, Goose and Bear! As we dive into Beach Read, I'd love to know: what tropes or character dynamics make a love story feel truly special to you?", "readyToEndChat": false }`;

    const result = parseStructuredOutputFromText(input);

    expect(result).toEqual({
      explanation:
        "I am initiating the discussion by welcoming the participants and introducing the main topic of love stories and tropes in the context of 'Beach Read'.",
      shouldRespond: true,
      response:
        "Welcome to the book club, Goose and Bear! As we dive into Beach Read, I'd love to know: what tropes or character dynamics make a love story feel truly special to you?",
      readyToEndChat: false,
    });
  });

  it('handles schema echo with simpler schema', () => {
    const input = `{ "type": "object", "properties": { "response": { "type": "string" } } }

{ "response": "Hello world" }`;

    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({response: 'Hello world'});
  });

  it('returns non-object for plain text (jsonrepair converts to string)', () => {
    // jsonrepair "repairs" plain text to a string, which is returned as-is
    // This tests the actual behavior - callers should check for object type
    const input = 'this is not json at all';
    const result = parseStructuredOutputFromText(input);
    expect(typeof result).toBe('string');
  });

  it('extracts fields from corrupted JSON via regex fallback', () => {
    // When jsonrepair fails, we fall back to regex extraction
    // This simulates Gemini inserting images mid-JSON
    const input = `{"explanation": "test message", "shouldRespond": true, [CORRUPTED IMAGE DATA] "response": "hello", "readyToEndChat": false}`;
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({
      explanation: 'test message',
      shouldRespond: true,
      response: 'hello',
      readyToEndChat: false,
    });
  });

  // jsonrepair-specific cases
  it('handles trailing commas', () => {
    const input = '{"explanation": "test", "shouldRespond": true,}';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('handles single quotes', () => {
    const input = "{'explanation': 'test', 'shouldRespond': true}";
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('handles unquoted keys', () => {
    const input = '{explanation: "test", shouldRespond: true}';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });

  it('handles missing closing brace', () => {
    // This can happen with LENGTH_ERROR (truncated responses)
    const input = '{"explanation": "test", "shouldRespond": true';
    const result = parseStructuredOutputFromText(input);
    expect(result).toEqual({explanation: 'test', shouldRespond: true});
  });
});

describe('getStructuredOutput', () => {
  it('returns parsedResponse if already present', () => {
    const response: ModelResponse = {
      status: ModelResponseStatus.OK,
      text: '{"other": "value"}',
      parsedResponse: {explanation: 'pre-parsed', shouldRespond: true},
    };
    const result = getStructuredOutput(response);
    expect(result).toEqual({explanation: 'pre-parsed', shouldRespond: true});
  });

  it('parses from text if no parsedResponse', () => {
    const response: ModelResponse = {
      status: ModelResponseStatus.OK,
      text: '{"explanation": "from text", "shouldRespond": false}',
    };
    const result = getStructuredOutput(response);
    expect(result).toEqual({explanation: 'from text', shouldRespond: false});
  });

  it('returns null if no text and no parsedResponse', () => {
    const response: ModelResponse = {
      status: ModelResponseStatus.OK,
    };
    const result = getStructuredOutput(response);
    expect(result).toBeNull();
  });
});
