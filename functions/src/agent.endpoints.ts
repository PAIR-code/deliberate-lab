import {
  ModelResponse,
  ModelResponseStatus,
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
