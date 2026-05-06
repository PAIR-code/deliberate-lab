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

    let prompt = '';

    if (isFirstGeneration) {
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

      // 3. Random Education
      const educationOptions = [
        'No high school diploma',
        'High school diploma',
        'Some college',
        "Bachelor's degree",
        "Master's degree",
        'Doctorate',
      ];
      const education =
        educationOptions[Math.floor(Math.random() * educationOptions.length)];

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

      prompt = buildGeneratePersonaPrompt({
        age,
        pronouns,
        education,
        big5,
        setting,
      });
    } else {
      prompt = buildEmbellishPersonaPrompt(currentText);
    }

    const modelSettings = createAgentModelSettings({apiType, modelName});
    // Generate: no maxTokens cap — the prompt instructs ~200-250 words so the
    // model stops naturally. A cap risks LENGTH_ERROR and partial output.
    // Embellish: small cap (200 tokens ≈ 150 words) to prevent runaway additions.
    // Reasoning/thinking is explicitly disabled for speed.
    const generationConfig = createModelGenerationConfig({
      temperature: isFirstGeneration ? 1.0 : 0.7,
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
