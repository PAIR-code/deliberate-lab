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
  port: number;
  // will probably need more data for server-side auth?
}


// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

const INVALID_API_KEY = ""
const INVALID_PORT = -1

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    geminiApiKey: INVALID_API_KEY,
    llamaApiKey: { url: INVALID_API_KEY, port: INVALID_PORT },
    activeApiKeyType: ApiKeyType.GEMINI_API_KEY
  };
}

export function checkApiKeyExists(experimenterData: ExperimenterData): boolean {
  // if gemini active and no api key selected
  if ((experimenterData.activeApiKeyType === ApiKeyType.GEMINI_API_KEY) && 
  (!experimenterData.geminiApiKey || experimenterData.geminiApiKey === INVALID_API_KEY)) {
    return false
  }
  // if llama active and no api key selected
  if ((experimenterData.activeApiKeyType === ApiKeyType.LLAMA_CUSTOM_URL) && 
  (!experimenterData.llamaApiKey.url || experimenterData.llamaApiKey.url === INVALID_API_KEY) &&
  (experimenterData.llamaApiKey.port === INVALID_PORT)) {
    return false
  }
  return true
}
