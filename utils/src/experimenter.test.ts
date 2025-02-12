import {
  ExperimenterData,
  ApiKeyType,
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
    expect(checkApiKeyExists(undefined)).toBe(false);
  });

  test('returns false if active API key type is Gemini and geminiApiKey is invalid', () => {
    experimenterData.apiKeys.activeApiKeyType = ApiKeyType.GEMINI_API_KEY;
    experimenterData.apiKeys.geminiApiKey = '';

    expect(checkApiKeyExists(experimenterData)).toBe(false);
  });

  test('returns true if active API key type is Gemini and geminiApiKey is valid', () => {
    experimenterData.apiKeys.activeApiKeyType = ApiKeyType.GEMINI_API_KEY;
    experimenterData.apiKeys.geminiApiKey = 'validApiKey';

    expect(checkApiKeyExists(experimenterData)).toBe(true);
  });

  test('returns false if active API key type is Ollama and ollamaApiKey is invalid', () => {
    experimenterData.apiKeys.activeApiKeyType = ApiKeyType.OLLAMA_CUSTOM_URL;
    experimenterData.apiKeys.ollamaApiKey = {url: ''};

    expect(checkApiKeyExists(experimenterData)).toBe(false);
  });

  test('returns true if active API key type is Ollama and ollamaApiKey is valid', () => {
    experimenterData.apiKeys.activeApiKeyType = ApiKeyType.OLLAMA_CUSTOM_URL;
    experimenterData.apiKeys.ollamaApiKey = {
      url: 'http://valid-url.com',
    };

    expect(checkApiKeyExists(experimenterData)).toBe(true);
  });

  test('returns false if active API key type is Ollama and ollamaApiKey is invalid', () => {
    experimenterData.apiKeys.activeApiKeyType = ApiKeyType.OLLAMA_CUSTOM_URL;
    experimenterData.apiKeys.ollamaApiKey = {
      url: 'http://valid-url.com',
    };

    expect(checkApiKeyExists(experimenterData)).toBe(false);
  });
});
