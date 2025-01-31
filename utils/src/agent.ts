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
