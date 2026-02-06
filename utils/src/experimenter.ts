/** Experimenter types and functions. */

import {Timestamp} from 'firebase/firestore';
import {UnifiedTimestamp} from './shared';
import {ApiKeyType} from './providers';

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
  hasResearchTemplateAccess: boolean;
}

/** Experimenter data (written to Firestore under experimenterData/{id}). */
export interface ExperimenterData {
  id: string;
  email: string;
  apiKeys: APIKeyConfig;
  // List of experiment IDs that the user has clicked on
  viewedExperiments: string[];
  showAlphaFeatures: boolean;
}

export interface APIKeyConfig {
  geminiApiKey: string; // distinct types since we don't want to lose information when switching between them
  openAIApiKey?: OpenAIServerConfig;
  claudeApiKey?: ClaudeServerConfig;
  ollamaApiKey: OllamaServerConfig;
}

export interface OpenAIServerConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ClaudeServerConfig {
  apiKey: string;
  baseUrl: string;
}

export interface OllamaServerConfig {
  url: string;
  apiKey?: string;
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
    hasResearchTemplateAccess: experimenter.hasResearchTemplateAccess ?? false,
    lastLogin: experimenter.lastLogin ?? null,
  };
}

export function createOpenAIServerConfig(): OpenAIServerConfig {
  return {
    apiKey: INVALID_API_KEY,
    baseUrl: EMPTY_BASE_URL,
  };
}

export function createClaudeServerConfig(): ClaudeServerConfig {
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
      ollamaApiKey: {url: INVALID_API_KEY, apiKey: INVALID_API_KEY},
    },
    email: experimenterEmail,
    viewedExperiments: [],
    showAlphaFeatures: false,
  };
}

export function checkApiKeyExists(
  apiKeyType: ApiKeyType,
  experimenterData: ExperimenterData | null | undefined,
): boolean {
  if (experimenterData === null || experimenterData === undefined) {
    return false;
  }
  // if active API key type is Gemini
  if (apiKeyType === ApiKeyType.GEMINI_API_KEY) {
    // implicitly checks if geminiApiKey exists
    return experimenterData.apiKeys.geminiApiKey !== INVALID_API_KEY;
  }

  if (apiKeyType === ApiKeyType.OPENAI_API_KEY) {
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
  if (apiKeyType === ApiKeyType.CLAUDE_API_KEY) {
    if (!experimenterData.apiKeys.claudeApiKey) {
      return false;
    }
    // A custom server could require no API key, and the default OpenAI server
    // requires no base URL setting, but leaving both blank is invalid.
    return (
      experimenterData.apiKeys.claudeApiKey.apiKey !== INVALID_API_KEY ||
      experimenterData.apiKeys.claudeApiKey.baseUrl !== EMPTY_BASE_URL
    );
  }

  // if active API key type is Ollama
  if (apiKeyType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    // implicitly checks if llamaApiKey exists
    return experimenterData.apiKeys.ollamaApiKey.url !== INVALID_API_KEY;
  }

  return false; // false if no valid condition is met
}
