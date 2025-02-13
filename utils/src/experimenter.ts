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
  lastLogin: UnifiedTimestamp | null; // null if never logged in
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
  // List of experiment IDs that the user has clicked on
  viewedExperiments: string[];
}

export interface APIKeyConfig {
  geminiApiKey: string; // distinct types since we don't want to lose information when switching between them
  openAIApiKey?: OpenAIServerConfig;
  ollamaApiKey: OllamaServerConfig;
  activeApiKeyType: ApiKeyType; // keeps track of model type selection
}

export enum ApiKeyType {
  GEMINI_API_KEY = 'GEMINI',
  OPENAI_API_KEY = 'OPENAI',
  OLLAMA_CUSTOM_URL = 'OLLAMA',
}

export interface OpenAIServerConfig {
  apiKey: string;
  baseUrl: string;
}

export interface OllamaServerConfig {
  url: string;
  // port: number; // apparently not needed? https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
  // will probably need more data for server-side auth?
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

const INVALID_API_KEY = '';
const EMPTY_BASE_URL = '';

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
    lastLogin: experimenter.lastLogin ?? null,
  };
}

export function createOpenAIServerConfig(): OpenAIServerConfig {
  return {
    apiKey: INVALID_API_KEY,
    baseUrl: EMPTY_BASE_URL,
  };
}

export function createExperimenterData(
  experimenterId: string,
  experimenterEmail: string,
): ExperimenterData {
  return {
    id: experimenterId,
    apiKeys: {
      geminiApiKey: INVALID_API_KEY,
      openAIApiKey: createOpenAIServerConfig(),
      ollamaApiKey: {url: INVALID_API_KEY},
      activeApiKeyType: ApiKeyType.GEMINI_API_KEY,
    },
    email: experimenterEmail,
    viewedExperiments: [],
  };
}

export function checkApiKeyExists(
  experimenterData: ExperimenterData | null | undefined,
): boolean {
  if (experimenterData === null || experimenterData === undefined) {
    return false;
  }
  // if active API key type is Gemini
  if (experimenterData.apiKeys.activeApiKeyType === ApiKeyType.GEMINI_API_KEY) {
    // implicitly checks if geminiApiKey exists
    return experimenterData.apiKeys.geminiApiKey !== INVALID_API_KEY;
  }

  if (experimenterData.apiKeys.activeApiKeyType === ApiKeyType.OPENAI_API_KEY) {
    if (!experimenterData.apiKeys.openAIApiKey) {
      return false;
    }
    // A custom server could require no API key, and the default OpenAI server
    // requires no base URL setting, but leaving both blank is invalid.
    return (
      experimenterData.apiKeys.openAIApiKey.apiKey !== INVALID_API_KEY ||
      experimenterData.apiKeys.openAIApiKey.baseUrl !== EMPTY_BASE_URL
    );
  }

  // if active API key type is Ollama
  if (
    experimenterData.apiKeys.activeApiKeyType === ApiKeyType.OLLAMA_CUSTOM_URL
  ) {
    // implicitly checks if llamaApiKey exists
    return experimenterData.apiKeys.ollamaApiKey.url !== INVALID_API_KEY;
  }

  return false; // false if no valid condition is met
}
