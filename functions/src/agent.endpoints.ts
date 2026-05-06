import {
  ModelResponse,
  ModelResponseStatus,
  PersonaGenerationMode,
  buildGeneratePersonaPrompt,
  buildEmbellishPersonaPrompt,
  createAgentModelSettings,
  createModelGenerationConfig,
} from '@deliberation-lab/utils';
import {getAgentResponse} from './agent.utils';
import {getExperimenterData} from './utils/firestore';

import {onCall} from 'firebase-functions/v2/https';

import {AuthGuard} from './utils/auth-guard';

// ****************************************************************************
// Test new agent configs
// Input structure: { creatorId, apiType }
// Validation: utils/src/agent.validation.ts
// ****************************************************************************
export const testAgentConfig = onCall(
  async (request): Promise<ModelResponse> => {
    const {data} = request;
    const creatorId = data.creatorId;
    const apiType = data.apiType;

    // Only allow experimenters to use this test endpoint
    await AuthGuard.isExperimenter(request);

    // Fetch experiment creator's API key and other experiment data
    const experimenterData = await getExperimenterData(creatorId);
    if (!experimenterData) {
      return {
        status: ModelResponseStatus.INTERNAL_ERROR,
        errorMessage: 'Experimenter data not found',
      };
    }

    const modelSettings = createAgentModelSettings({apiType});
    const prompt = 'Say "hello world" and tell a unique joke.';
    const generationConfig = createModelGenerationConfig();

    const response = await getAgentResponse(
      experimenterData.apiKeys,
      prompt,
      modelSettings,
      generationConfig,
    );

    console.log('TESTING AGENT CONFIG\n', apiType, response);

    return response;
  },
);

// ****************************************************************************
// Generate or embellish an agent persona context (character sketch)
// Input structure: { creatorId, mode, currentText, apiType, modelName }
// ****************************************************************************
export const generatePersonaContext = onCall(
  async (request): Promise<ModelResponse> => {
    const {data} = request;
    const creatorId: string = data.creatorId;
    const mode: PersonaGenerationMode = data.mode;
    const currentText: string = data.currentText ?? '';
    const apiType = data.apiType;
    const modelName: string = data.modelName ?? '';

    // Only allow experimenters to use this endpoint
    await AuthGuard.isExperimenter(request);

    if (!modelName) {
      return {
        status: ModelResponseStatus.INTERNAL_ERROR,
        errorMessage: 'No model selected',
      };
    }

    // Fetch experimenter's API keys
    const experimenterData = await getExperimenterData(creatorId);
    if (!experimenterData) {
      return {
        status: ModelResponseStatus.INTERNAL_ERROR,
        errorMessage: 'Experimenter data not found',
      };
    }

    // Build prompt based on mode
    // Embellish on empty text behaves like generate
    const isFirstGeneration = mode === 'generate' || !currentText.trim();
    const prompt = isFirstGeneration
      ? buildGeneratePersonaPrompt()
      : buildEmbellishPersonaPrompt(currentText);

    const modelSettings = createAgentModelSettings({apiType, modelName});
    // Generate: no maxTokens cap — the prompt instructs ~200-250 words so the
    // model stops naturally. A cap risks LENGTH_ERROR and partial output.
    // Embellish: small cap (200 tokens ≈ 150 words) to prevent runaway additions.
    // Reasoning/thinking is explicitly disabled for speed — persona generation
    // is a creative writing task that doesn't benefit from extended reasoning.
    const generationConfig = createModelGenerationConfig({
      temperature: isFirstGeneration ? 0.9 : 0.7,
      ...(isFirstGeneration ? {} : {maxTokens: 200}),
      includeReasoning: false,
      // Force thinkingBudget: 0 for Gemini 2.5+ (always-thinking models)
      // and disable thinking for Anthropic. This overrides any auto-enable.
      providerOptions: {
        google: {thinkingConfig: {thinkingBudget: 0}},
        anthropic: {thinking: {type: 'disabled'}},
      },
    });

    const response = await getAgentResponse(
      experimenterData.apiKeys,
      prompt,
      modelSettings,
      generationConfig,
    );

    console.log('GENERATE PERSONA CONTEXT\n', mode, response);

    return response;
  },
);
