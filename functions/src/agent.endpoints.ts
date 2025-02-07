import {
  ExperimenterData,
  StageConfig,
  StageKind,
  ParticipantProfileExtended,
} from '@deliberation-lab/utils';
import {getAgentResponse} from './agent.utils';
import {getAgentParticipantRankingStageResponse} from './stages/ranking.utils';

import { onCall } from 'firebase-functions/v2/https';

import { app } from './app';
import { AuthGuard } from './utils/auth-guard';

// ****************************************************************************
// Test agent participant prompts
// Input structure: { experimentId, participantId, stageId }
// Validation: utils/src/agent.validation.ts
// ****************************************************************************
export const testAgentParticipantPrompt = onCall(async (request) => {
  const { data } = request;

  // Only allow experimenters to use this test endpoint for now
  await AuthGuard.isExperimenter(request);

  const experimentId = data.experimentId;
  const stageId = data.stageId;
  const participantPrivateId = data.participantId;

  // Fetch experiment creator's API key and other experiment data.
  const creatorId = (
    await app.firestore().collection('experiments').doc(experimentId).get()
  ).data()?.metadata.creator;
  const creatorDoc = await app.firestore().collection('experimenterData').doc(creatorId).get();
  if (!creatorDoc.exists) return;

  const experimenterData = creatorDoc.data() as ExperimenterData;

  // Fetch participant config (in case needed to help construct prompt)
  const participant = (await app.firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantPrivateId)
    .get()
  ).data() as ParticipantProfileExtended;

  // Fetch stage config (to determine which prompt to send)
  const stage = (await app.firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('stages')
    .doc(stageId)
    .get()
  ).data() as StageConfig;

  // TODO: Use utils functions to construct prompt based on stage type
  let prompt = '';
  switch (stage.kind) {
    case StageKind.RANKING:
      // Call utils function to generate ranking answer via LLM call
      return await getAgentParticipantRankingStageResponse(
        experimentId,
        experimenterData,
        participant,
        stage
      );
    case StageKind.SURVEY:
      return await createAgentParticipantSurveyStagePrompt()
    default:
      prompt = `This is a test prompt. Please output a funny joke.`;
  }

  // Call LLM API
  const response = await getAgentResponse(experimenterData, prompt);
  // Check console log for response
  console.log(
    'TESTING AGENT PARTICIPANT PROMPT\n',
    `Experiment: ${experimentId}\n`,
    `Participant: ${participant.publicId}\n`,
    `Stage: ${stage.name} (${stage.kind})\n`,
    response
  );

  return { data: response };
});
