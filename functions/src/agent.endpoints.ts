import {
  ModelResponse,
  ModelResponseStatus,
  PersonaGenerationMode,
  buildGeneratePersonaPrompt,
  buildMergePersonaPrompt,
  buildEnhancePersonaPrompt,
  createAgentModelSettings,
  createModelGenerationConfig,
} from '@deliberation-lab/utils';
import {getAgentResponse} from './agent.utils';
import {samplePersonaParams} from './agent_persona_sampling';
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
// Generate or enhance an agent persona context (character sketch)
// Input structure: { creatorId, mode, currentText, apiType, modelName }
// Modes:
//   'generate' — fresh sketch (empty) or merge-expand (has text)
//   'enhance'  — appends episodic memories to existing sketch
//   'refresh'  — ignores existing text, always generates fresh
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
    let prompt = '';

    if (mode === 'enhance') {
      // Enhance: append episodic memories to existing sketch
      prompt = buildEnhancePersonaPrompt(currentText);
    } else {
      // Generate or Refresh: sample random parameters.
      // All sampling logic lives in agent_persona_sampling.ts.
      const isRefresh = mode === 'refresh';
      const params = samplePersonaParams();

      if (!isRefresh && currentText.trim()) {
        prompt = buildMergePersonaPrompt(currentText, params);
      } else {
        prompt = buildGeneratePersonaPrompt(params);
      }
    }

    const modelSettings = createAgentModelSettings({apiType, modelName});
    // Generate/Refresh: no maxTokens cap — prompt instructs ~200-250 words.
    // Enhance: small cap (200 tokens ≈ 150 words) to prevent runaway additions.
    // Reasoning/thinking is explicitly disabled for speed.
    const isEnhanceMode = mode === 'enhance';
    const generationConfig = createModelGenerationConfig({
      temperature: 1.0,
      ...(isEnhanceMode ? {maxTokens: 200} : {}),
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
