/** Experimenter types and functions. */

import {Timestamp} from 'firebase/firestore';
import {UnifiedTimestamp} from './shared';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //


/** Experimenter public profile (written to Firestore under experimenters/{id}). */
export interface ExperimenterProfile {
  name: string;
  email: string;
  lastLogin: UnifiedTimestamp|null; // null if never logged in
}

/** Full experimenter profile built from allowlist and experimenter data. */
export interface ExperimenterProfileExtended extends ExperimenterProfile {
  id: string;
  isAdmin: boolean;
}

/** Experimenter data (written to Firestore under experimenterData/{id}). */
export interface ExperimenterData {
  /* 
  Currently supports either all ollama or all gemini
  TODO: refactor this as a list of types and values for each mediator(see design document)
  */
  id: string;
  email: string;
  apiKeys: APIKeyConfig;
}

export interface APIKeyConfig {
  geminiApiKey: string, // distinct types since we don't want to lose information when switching between them
  ollamaApiKey: OllamaServerConfig
  activeApiKeyType: ApiKeyType; // keeps track of model type selection
}

export enum ApiKeyType {
  GEMINI_API_KEY = 'GEMINI',
  OLLAMA_CUSTOM_URL = 'OLLAMA',
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

export function getFullExperimenterConfig(
  experimenter: Partial<ExperimenterProfileExtended> = {},
): ExperimenterProfileExtended {
  return {
    id: experimenter.id ?? '',
    name: experimenter.name ?? '',
    email: experimenter.email ?? '',
    isAdmin: experimenter.isAdmin ?? false,
    lastLogin: experimenter.lastLogin ?? null
  };
}

export function createExperimenterData(
  experimenterId: string, experimenterEmail: string
): ExperimenterData {
  return {
    id: experimenterId,
    apiKeys: {
      geminiApiKey: INVALID_API_KEY,
      ollamaApiKey: { url: INVALID_API_KEY, llmType: INVALID_LLM_TYPE },
      activeApiKeyType: ApiKeyType.GEMINI_API_KEY
    },
    email: experimenterEmail
  };
}


export function checkApiKeyExists(experimenterData: ExperimenterData | null | undefined): boolean {
  if (experimenterData === null || experimenterData === undefined) {
    return false
  }
  // if active API key type is Gemini
  if (experimenterData.apiKeys.activeApiKeyType === ApiKeyType.GEMINI_API_KEY) {
    // implicitly checks if geminiApiKey exists
    return experimenterData.apiKeys.geminiApiKey !== INVALID_API_KEY
  }

  // if active API key type is Ollama
  if (experimenterData.apiKeys.activeApiKeyType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    // implicitly checks if llamaApiKey exists
    return (
      (experimenterData.apiKeys.ollamaApiKey.url !== INVALID_API_KEY) &&
      (experimenterData.apiKeys.ollamaApiKey.llmType !== INVALID_LLM_TYPE)
    );
  }

  return false; // false if no valid condition is met
}