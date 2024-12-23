/** Experimenter types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Experimenter profile (written to Firestore under experimenters/{id}). */
export interface ExperimenterProfile {
  id: string;
  name: string;
  email: string;
}

/** Experimenter data (written to Firestore under experimenterData/{id}). */
export interface ExperimenterData {
  /* 
  Currently supports either all ollama or all gemini
  TODO: refactor this as a list of types and values for each mediator(see design document)
  */
  id: string;
  geminiApiKey: string, // distinct types since we don't want to lose information when switching between them
  ollamaApiKey: OllamaServerConfig
  activeApiKeyType: ApiKeyType // keeps track of model type selection
}

export enum ApiKeyType {
  GEMINI_API_KEY = 'Gemini',
  OLLAMA_CUSTOM_URL = 'ollama',
}

export interface OllamaServerConfig {
  url: string;
  /*
  * The type of llm running in the server (e.g. "llama3.2"). 
  * Keep in mind that the model must have been loaded server-side in order to be used.
  */
  llmType: string
  // port: number; // apparently not needed? https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
  // will probably need more data for server-side auth?
}


// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

const INVALID_API_KEY = ''
const INVALID_LLM_TYPE = ''

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    geminiApiKey: INVALID_API_KEY,
    ollamaApiKey: { url: INVALID_API_KEY, llmType: INVALID_LLM_TYPE},
    activeApiKeyType: ApiKeyType.GEMINI_API_KEY
  };
}


export function checkApiKeyExists(experimenterData: ExperimenterData | null | undefined): boolean {
  if (experimenterData === null || experimenterData === undefined) {
    return false
  }
  // if active API key type is Gemini
  if (experimenterData.activeApiKeyType === ApiKeyType.GEMINI_API_KEY) {
    // implicitly checks if geminiApiKey exists
    return experimenterData.geminiApiKey !== INVALID_API_KEY
  }

  // if active API key type is Ollama
  if (experimenterData.activeApiKeyType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    // implicitly checks if llamaApiKey exists
    return (
      (experimenterData.ollamaApiKey.url !== INVALID_API_KEY) &&
      (experimenterData.ollamaApiKey.llmType !== INVALID_LLM_TYPE)
    );
  }

  return false; // false if no valid condition is met
}