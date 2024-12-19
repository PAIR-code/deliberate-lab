import {
    ExperimenterData,
    ApiKeyType,
    checkApiKeyExists,
    createExperimenterData
} from './experimenter';

describe('checkApiKeyExists', () => {
    let experimenterData: ExperimenterData;

    beforeEach(() => {
        // default experimenter data object
        experimenterData = createExperimenterData('testExperimenter');
    });

    test('returns false if active API key type is object is undefined', () => {
        expect(checkApiKeyExists(undefined)).toBe(false);
    });

    test('returns false if active API key type is Gemini and geminiApiKey is invalid', () => {
        experimenterData.activeApiKeyType = ApiKeyType.GEMINI_API_KEY;
        experimenterData.geminiApiKey = '';

        expect(checkApiKeyExists(experimenterData)).toBe(false);
    });

    test('returns true if active API key type is Gemini and geminiApiKey is valid', () => {
        experimenterData.activeApiKeyType = ApiKeyType.GEMINI_API_KEY;
        experimenterData.geminiApiKey = 'validApiKey';

        expect(checkApiKeyExists(experimenterData)).toBe(true);
    });

    test('returns false if active API key type is Llama and llamaApiKey is invalid', () => {
        experimenterData.activeApiKeyType = ApiKeyType.LLAMA_CUSTOM_URL;
        experimenterData.llamaApiKey = { url: '' , llmType: "llama3.2"};

        expect(checkApiKeyExists(experimenterData)).toBe(false);
    });

    test('returns true if active API key type is Llama and llamaApiKey is valid', () => {
        experimenterData.activeApiKeyType = ApiKeyType.LLAMA_CUSTOM_URL;
        experimenterData.llamaApiKey = { url: 'http://valid-url.com' , llmType: "llama3.2" };

        expect(checkApiKeyExists(experimenterData)).toBe(true);
    });

    test('returns false if active API key type is Llama and llamaApiKey is invalid', () => {
        experimenterData.activeApiKeyType = ApiKeyType.LLAMA_CUSTOM_URL;
        experimenterData.llamaApiKey = { url: 'http://valid-url.com' , llmType: '' };

        expect(checkApiKeyExists(experimenterData)).toBe(false);
    });

});
