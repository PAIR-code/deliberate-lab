import {
  ModelResponseStatus,
  createModelGenerationConfig,
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
export const testAgentConfig = onCall(async (request) => {
  const {data} = request;
  const agentConfig = data.agentConfig;
  const promptConfig = data.promptConfig;
  const creatorId = data.creatorId;

  // Only allow experimenters to use this test endpoint
  await AuthGuard.isExperimenter(request);

  // Fetch experiment creator's API key and other experiment data
  const experimenterData = await getExperimenterData(creatorId);
  if (!experimenterData) return;

  // TODO: Use fake (e.g., chat) data when running prompt?
  const prompt = promptConfig.promptContext;
  const generationConfig = createModelGenerationConfig();

  const response = await getAgentResponse(
    experimenterData.apiKeys,
    prompt,
    agentConfig.defaultModelSettings,
    generationConfig,
  );

  // Check console log for response
  console.log(
    'TESTING AGENT CONFIG\n',
    JSON.stringify(agentConfig),
    JSON.stringify(promptConfig),
    response,
  );

  if (response.status !== ModelResponseStatus.OK) {
    return {data: `Error: ${response.status}: ${response.errorMessage}`};
  }

  return {data: response.text};
});
