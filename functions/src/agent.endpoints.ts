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
      // Generate or Refresh: sample random parameters
      // Refresh always ignores existing text; Generate merge-expands if text exists
      const isRefresh = mode === 'refresh';

      // 1. Random Age (18 to 85)
      const age = Math.floor(Math.random() * (85 - 18 + 1)) + 18;

      // 2. Random Pronouns (Census-aligned weighted distribution)
      const rand = Math.random();
      let pronouns = 'she/her';
      if (rand < 0.5) {
        pronouns = 'she/her';
      } else if (rand < 0.98) {
        pronouns = 'he/him';
      } else {
        pronouns = 'they/them';
      }

      // 3. Random Education (US Census weighted distribution)
      const randEd = Math.random();
      let education = '';
      if (randEd < 0.1) {
        education = 'No high school diploma';
      } else if (randEd < 0.38) {
        education = 'High school diploma';
      } else if (randEd < 0.64) {
        education = "Some college or Associate's degree";
      } else if (randEd < 0.86) {
        education = "Bachelor's degree";
      } else if (randEd < 0.96) {
        education = "Master's degree";
      } else {
        education = 'Doctorate or Professional degree';
      }

      // 4. Random Big Five Profile (Scores on a 1-10 scale)
      const generateScore = () => `${Math.floor(Math.random() * 10) + 1}/10`;
      const big5 = {
        openness: generateScore(),
        conscientiousness: generateScore(),
        extraversion: generateScore(),
        agreeableness: generateScore(),
        neuroticism: generateScore(),
      };

      // 5. Random setting to break the "urban professional" bias
      const settings = ['Urban', 'Suburban', 'Rural', 'Remote/Isolated'];
      const setting = settings[Math.floor(Math.random() * settings.length)];

      // 6. Random verbosity (1-5, uniform — no census prior applies here)
      const verbosity = Math.ceil(Math.random() * 5);

      const params = {age, pronouns, education, big5, setting, verbosity};

      if (!isRefresh && currentText.trim()) {
        // Generate with existing text: merge-expand
        prompt = buildMergePersonaPrompt(currentText, params);
      } else {
        // Fresh generate or refresh: write from scratch
        prompt = buildGeneratePersonaPrompt(params);
      }
    }

    const modelSettings = createAgentModelSettings({apiType, modelName});
    // Generate/Refresh: no maxTokens cap — prompt instructs ~200-250 words.
    // Enhance: small cap (200 tokens ≈ 150 words) to prevent runaway additions.
    // Reasoning/thinking is explicitly disabled for speed.
    const isEnhanceMode = mode === 'enhance';
    const generationConfig = createModelGenerationConfig({
      temperature: isEnhanceMode ? 0.7 : 1.0,
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
