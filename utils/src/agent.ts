export interface CustomRequestBodyField {
  name: string;
  value: string;
}

export interface AgentGenerationConfig {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  customRequestBodyFields: CustomRequestBodyField[];
}

// Specifies which API to use for model calls
// TODO: Rename enum (ApiType? LLMApiType?)
export enum ApiKeyType {
  GEMINI_API_KEY = 'GEMINI',
  OPENAI_API_KEY = 'OPENAI',
  OLLAMA_CUSTOM_URL = 'OLLAMA',
}
