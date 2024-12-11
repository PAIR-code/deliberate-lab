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
  Currently supports either all Llama or all gemini
  TODO: refactor this as a list of types and values for each mediator(see design document)
  */
  id: string;
  geminiApiKey: string, // distinct types since we don't want to lose information when switching between them
  llamaApiKey: LlamaServerConfig
  activeApiKeyType: ApiKeyType // keeps track of model type selection
}

export enum ApiKeyType {
  GEMINI_API_KEY = 'Gemini',
  LLAMA_CUSTOM_URL = 'Llama',
}

export interface LlamaServerConfig {
  url: string;
  llmType: string
  //port: number; // apparently not needed? https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
  // will probably need more data for server-side auth?
}


// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

const INVALID_API_KEY = ''

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    geminiApiKey: INVALID_API_KEY,
    llamaApiKey: { url: INVALID_API_KEY, llmType: "llama3.2"},
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

  // if active API key type is Llama
  if (experimenterData.activeApiKeyType === ApiKeyType.LLAMA_CUSTOM_URL) {
    // implicitly checks if llamaApiKey exists
    return (
      experimenterData.llamaApiKey.url !== INVALID_API_KEY
    );
  }
  console.log(experimenterData);
  return false; // false if no valid condition is met
}