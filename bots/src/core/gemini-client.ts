import {GoogleGenAI} from '@google/genai';

/**
 * Check whether a Gemini API key is available in the environment.
 */
export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export interface GeminiStructuredOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  responseSchema?: Record<string, unknown>;
}

/**
 * Make a structured JSON call to the Gemini API using @google/genai.
 */
export async function callGeminiStructured<T>(
  options: GeminiStructuredOptions,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const ai = new GoogleGenAI({apiKey});
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const config: Record<string, unknown> = {
    responseMimeType: 'application/json',
  };

  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

  const response = await ai.models.generateContent({
    model,
    contents: options.prompt,
    config,
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini structured JSON response: ${(err as Error).message}\nRaw text: ${text}`,
    );
  }
}
