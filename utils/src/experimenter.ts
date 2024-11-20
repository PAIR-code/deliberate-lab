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
  GEMINI_API_KEY = 'gemini',
  LLAMA_CUSTOM_URL = 'llamaCustomUrl',
}

export interface LlamaServerConfig {
  url: string;
  port: number;
  // will probably need more data for server-side auth?
}


// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    geminiApiKey: "",
    llamaApiKey: { url: "", port: -1 },
    activeApiKeyType: ApiKeyType.GEMINI_API_KEY
  };
}
