import {ApiKeyType} from './providers';
import {
  ExperimenterData,
  checkApiKeyExists,
  createExperimenterData,
} from './experimenter';

describe('checkApiKeyExists', () => {
  let experimenterData: ExperimenterData;

  beforeEach(() => {
    // default experimenter data object
    experimenterData = createExperimenterData(
      'testExperimenter',
      'example@mainModule.com',
    );
  });

  test('returns false if active API key type is object is undefined', () => {
    expect(checkApiKeyExists(ApiKeyType.GEMINI_API_KEY, undefined)).toBe(false);
    expect(checkApiKeyExists(ApiKeyType.OLLAMA_CUSTOM_URL, undefined)).toBe(
      false,
    );
  });

  test('returns false if active API key type is Gemini and geminiApiKey is invalid', () => {
    experimenterData.apiKeys.geminiApiKey = '';
    expect(checkApiKeyExists(ApiKeyType.GEMINI_API_KEY, experimenterData)).toBe(
      false,
    );
  });

  test('returns true if active API key type is Gemini and geminiApiKey is valid', () => {
    experimenterData.apiKeys.geminiApiKey = 'validApiKey';
    expect(checkApiKeyExists(ApiKeyType.GEMINI_API_KEY, experimenterData)).toBe(
      true,
    );
  });

  test('returns false if active API key type is Ollama and ollamaApiKey is invalid', () => {
    experimenterData.apiKeys.ollamaApiKey = {url: '', apiKey: ''};
    expect(
      checkApiKeyExists(ApiKeyType.OLLAMA_CUSTOM_URL, experimenterData),
    ).toBe(false);
  });

  test('returns true if active API key type is Ollama and ollamaApiKey is valid', () => {
    experimenterData.apiKeys.ollamaApiKey = {
      url: 'http://valid-url.com',
      apiKey: '',
    };
    expect(
      checkApiKeyExists(ApiKeyType.OLLAMA_CUSTOM_URL, experimenterData),
    ).toBe(true);
  });
});
