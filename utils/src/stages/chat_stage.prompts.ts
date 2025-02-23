// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_MODEL = 'gemini-1.5-pro-latest';
export const DEFAULT_AGENT_MEDIATOR_PROMPT = `You are a agent for a chat conversation. Your task is to ensure that the conversation is polite.
If you notice that participants are being rude, step in to make sure that everyone is respectful. 
Otherwise, do not respond.`;

export const DEFAULT_RESPONSE_FIELD = 'response';
export const DEFAULT_EXPLANATION_FIELD = 'explanation';
export const DEFAULT_JSON_FORMATTING_INSTRUCTIONS = `INSTRUCTIONS:
  Now, you have the opportunity to respond to the conversation. This response will be appended to the end of the transcript.
  Fill out the following JSON response:
    1. Do you want to add a message to the chat? ("true" or "false")
    2. If yes, what would you like to say?
    3. Why do you want to say that?
  
  IMPORTANT: Your output should be in a JSON dictionary exactly like the example output below. Just the JSON! Make sure the JSON is valid. No need to add any delimiters, just begin with a { bracket as in the example below.
  
  EXAMPLE OUTPUT:
  {
    "shouldRespond": true,
    "${DEFAULT_RESPONSE_FIELD}": "This is my response.",
    "${DEFAULT_EXPLANATION_FIELD}": "This is why I chose this response."
  }
  
  EXAMPLE OUTPUT:
  {
    "shouldRespond": false,
    "${DEFAULT_RESPONSE_FIELD}": "",
    "${DEFAULT_EXPLANATION_FIELD}": "I have spoken recently and want to give others a chance to speak."
  }`;

export const DEFAULT_STRING_FORMATTING_INSTRUCTIONS = `If you would like to respond, respond with the message you would like to send only (no timestamps or metadata), for example, "Hey everyone, please be respectful." This will be appended to the end of the chat transcript. If you don't wish to respond, respond with an empty string.`;
