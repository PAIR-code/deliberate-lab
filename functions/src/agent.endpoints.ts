import {
  ModelResponse,
  ModelResponseStatus,
  PromptItemType,
  TextPromptItem,
} from '@deliberation-lab/utils';
import {getAgentResponse} from './agent.utils';
import {getExperimenterData} from './utils/firestore';

import {onCall} from 'firebase-functions/v2/https';

import {AuthGuard} from './utils/auth-guard';

// ****************************************************************************
// Test new agent configs
// Input structure: { creatorId, agentConfig, promptConfig }
// Validation: utils/src/agent.validation.ts
// ****************************************************************************
export const testAgentConfig = onCall(
  async (request): Promise<ModelResponse> => {
    const {data} = request;
    const agentConfig = data.agentConfig;
    const promptConfig = data.promptConfig;
    const creatorId = data.creatorId;

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

    // Convert PromptItem[] to string for testing
    const prompt = promptConfig.prompt
      .filter(
        (item: {type: PromptItemType}) => item.type === PromptItemType.TEXT,
      )
      .map((item: TextPromptItem) => item.text)
      .join('\n');

    const response = await getAgentResponse(
      experimenterData.apiKeys,
      prompt,
      agentConfig.defaultModelSettings,
      promptConfig.generationConfig,
      promptConfig.structuredOutputConfig,
    );

    // Check console log for response
    console.log(
      'TESTING AGENT CONFIG\n',
      JSON.stringify(agentConfig),
      JSON.stringify(promptConfig),
      response,
    );

    return response;
  },
);
