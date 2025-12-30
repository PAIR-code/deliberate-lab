import {jsonrepair} from 'jsonrepair';

export enum ModelResponseStatus {
  // A successful response.
  OK = 'ok',
  // The provider returned an otherwise-valid response, but Deliberate Lab
  // couldn't parse it in the expected structured output format. The plaintext
  // response will be present in the text field.
  STRUCTURED_OUTPUT_PARSE_ERROR = 'structured_output_parse_error',
  // The provider didn't accept the authentication for this request, e.g.
  // because of a missing or invalid API key.
  AUTHENTICATION_ERROR = 'authentication_error',
  // The provider denied the request because the account ran out of quota or funds.
  QUOTA_ERROR = 'quota_error',
  // Deliberate Lab couldn't reach the provider, or received a server error
  // response. This error may be transient.
  PROVIDER_UNAVAILABLE_ERROR = 'provider_unavailable_error',
  // The provider refused the request for policy or safety reasons.
  REFUSAL_ERROR = 'refusal_error',
  // The response reached the configured output token limit and was terminated
  // early. The partial response will be present in the text field.
  LENGTH_ERROR = 'length_error',
  // The agent's config is invalid.
  CONFIG_ERROR = 'config_error',
  // Deliberate Lab encountered an internal error.
  INTERNAL_ERROR = 'internal_error',
  // Catchall category for errors not covered above.
  UNKNOWN_ERROR = 'unknown_error',
  // No response generated
  NONE = 'none',
}

/**
 * Token usage information from the model response.
 */
export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * File data from model response (images, audio, etc.).
 * Uses AI SDK naming conventions (mediaType, base64).
 */
export interface ModelFile {
  mediaType: string;
  base64: string;
}

/**
 * File that has been uploaded to storage.
 * The stored version of ModelFile, with URL instead of base64.
 */
export interface StoredFile {
  mediaType: string;
  url: string;
}

/** Categories of file types for rendering decisions */
export enum FileCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

/** Get the category of a file based on its mediaType */
export function getFileCategory(file: StoredFile | ModelFile): FileCategory {
  const type = file.mediaType.split('/')[0];
  switch (type) {
    case 'image':
      return FileCategory.IMAGE;
    case 'video':
      return FileCategory.VIDEO;
    case 'audio':
      return FileCategory.AUDIO;
    case 'application':
      // PDFs, documents, etc.
      return FileCategory.DOCUMENT;
    default:
      return FileCategory.OTHER;
  }
}

/** Check if a file is a media file (image, video, or audio) */
export function isMediaFile(file: StoredFile | ModelFile): boolean {
  const category = getFileCategory(file);
  return (
    category === FileCategory.IMAGE ||
    category === FileCategory.VIDEO ||
    category === FileCategory.AUDIO
  );
}

/** Check if a file is an image */
export function isImageFile(file: StoredFile | ModelFile): boolean {
  return getFileCategory(file) === FileCategory.IMAGE;
}

/** Get file extension from mediaType (e.g., 'image/png' -> 'png') */
export function getFileExtension(file: StoredFile | ModelFile): string {
  return file.mediaType.split('/')[1] || 'file';
}

/** Filter files by category */
export function getFilesByCategory<T extends StoredFile | ModelFile>(
  files: T[],
  category: FileCategory,
): T[] {
  return files.filter((f) => getFileCategory(f) === category);
}

/**
 * Common interface for all model responses.
 */
export interface ModelResponse {
  status: ModelResponseStatus;
  // The model config passed to API
  generationConfig?: object;
  // The model's raw response (no parsing or extracting)
  rawResponse?: string;
  // The model's response, in plaintext. Null if the provider didn't return a response.
  text?: string;
  // The model's response in JSON
  parsedResponse?: object;
  errorMessage?: string;
  // Reasoning/thought blocks (concatenated if multiple)
  reasoning?: string;
  // List of files from response (images, etc.) - excludes files from thought blocks
  files?: ModelFile[];
  // Token usage information
  usage?: ModelUsage;
}

/**
 * Helper function to sanitize rawResponse for logging by replacing
 * base64 image data and thought signatures with placeholders to avoid overwhelming console output.
 */
export function sanitizeRawResponseForLogging(rawResponse?: string): string {
  if (!rawResponse) {
    return '';
  }

  try {
    const response = JSON.parse(rawResponse);

    // Function to recursively replace image data and thought signatures in nested objects
    const replaceImageData = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => replaceImageData(item));
      }

      // Type guard: ensure obj is a record
      const record = obj as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key in record) {
        if (
          key === 'data' &&
          typeof record[key] === 'string' &&
          (record[key] as string).length > 100
        ) {
          // Replace long base64 data strings with placeholder
          result[key] = '[IMAGE DATA]';
        } else if (
          key === 'thoughtSignature' &&
          typeof record[key] === 'string'
        ) {
          // Replace thought signatures with placeholder
          result[key] = '[THOUGHT SIGNATURE]';
        } else if (typeof record[key] === 'object') {
          result[key] = replaceImageData(record[key]);
        } else {
          result[key] = record[key];
        }
      }
      return result;
    };

    const sanitized = replaceImageData(response);
    return JSON.stringify(sanitized, null, 2);
  } catch {
    // If parsing fails, return original string
    return rawResponse;
  }
}

/** Helper function for parsing model response. */
export function addParsedModelResponse(response: ModelResponse) {
  if (response.status !== ModelResponseStatus.OK) {
    return;
  }

  try {
    const cleanedText = response.text!.replace(/```json\s*|\s*```/g, '').trim();
    response.parsedResponse = JSON.parse(cleanedText);
    return response;
  } catch (error) {
    response.status = ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR;
    response.errorMessage =
      error instanceof Error ? error.message : String(error);
    return response;
  }
}

/**
 * Extract known fields from corrupted JSON using regex.
 * This is a fallback when jsonrepair fails, e.g., when Gemini inserts
 * images in the middle of JSON output, corrupting the structure.
 */
function extractFieldsFromCorruptedJson(
  text: string,
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};

  // Extract common structured output fields using regex
  // Pattern: "fieldName": "value" or "fieldName": value (for booleans/numbers)

  // Extract string fields (handles escaped quotes and newlines)
  const stringFieldPattern =
    /"(explanation|response|message)":\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = stringFieldPattern.exec(text)) !== null) {
    const [, fieldName, value] = match;
    // Unescape the value
    result[fieldName] = value
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  // Extract boolean fields
  const boolFieldPattern = /"(shouldRespond|readyToEndChat)":\s*(true|false)/g;
  while ((match = boolFieldPattern.exec(text)) !== null) {
    const [, fieldName, value] = match;
    result[fieldName] = value === 'true';
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse structured output from text.
 * Uses jsonrepair to handle markdown code blocks, malformed JSON, etc.
 */
export function parseStructuredOutputFromText(
  text: string,
): Record<string, unknown> | null {
  const trimmed = text.trim();

  // Strategy 1: Handle "json\n{...}" prefix (jsonrepair misinterprets this as array)
  const jsonPrefixMatch = trimmed.match(/^json\s*\n(\{[\s\S]*\})$/);
  if (jsonPrefixMatch && jsonPrefixMatch[1]) {
    try {
      return JSON.parse(jsonrepair(jsonPrefixMatch[1])) as Record<
        string,
        unknown
      >;
    } catch (e) {
      console.error('Strategy 1 (json prefix) JSON parse error:', e);
    }
  }

  // Strategy 2: Let jsonrepair handle everything else (markdown, raw JSON, malformed)
  try {
    return JSON.parse(jsonrepair(trimmed)) as Record<string, unknown>;
  } catch (e) {
    console.error('Strategy 2 (jsonrepair) JSON parse error:', e);
  }

  // Strategy 3: Extract fields via regex when JSON is especially corrupted
  // (e.g., when Gemini inserts images in the middle of JSON output)
  const extractedFields = extractFieldsFromCorruptedJson(trimmed);
  if (extractedFields && Object.keys(extractedFields).length > 0) {
    console.log(
      'Strategy 3 (regex extraction) recovered fields:',
      Object.keys(extractedFields),
    );
    return extractedFields;
  }

  return null;
}

/**
 * Get structured output from ModelResponse.
 * Prefers native parsedResponse (from AI SDK's Output.object()),
 * falls back to regex parsing from text.
 */
export function getStructuredOutput(
  response: ModelResponse,
): Record<string, unknown> | null {
  // Only use parsedResponse if it's an actual object (not a string)
  if (
    response.parsedResponse &&
    typeof response.parsedResponse === 'object' &&
    response.parsedResponse !== null
  ) {
    return response.parsedResponse as Record<string, unknown>;
  }
  if (response.text) {
    return parseStructuredOutputFromText(response.text);
  }
  return null;
}
