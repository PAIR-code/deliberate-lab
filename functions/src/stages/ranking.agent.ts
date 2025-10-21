import {
  APIKeyConfig,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  RankingStageConfig,
  createAgentParticipantRankingStagePrompt,
  createModelGenerationConfig,
  createRankingStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {getAgentResponse} from '../agent.utils';
import {getPastStagesPromptContext} from './stage.utils';

import {app} from '../app';

/** Use LLM call to generate agent participant response to ranking stage. */
export async function getAgentParticipantRankingStageResponse(
  experimentId: string,
  apiKeyConfig: APIKeyConfig, // for making LLM call
  participant: ParticipantProfileExtended,
  stage: RankingStageConfig,
) {
  // If participant is not an agent, return
  if (!participant.agentConfig) {
    return;
  }

  // TODO: If ranking is items (not participants), rank items instead.

  // Get list of public IDs for other participants who are active in the cohort
  // (in case the agent participant is ranking participants)
  // TODO: Use shared utils to determine isActiveParticipant
  const activeStatuses = [
    ParticipantStatus.IN_PROGRESS,
    ParticipantStatus.SUCCESS,
    ParticipantStatus.ATTENTION_CHECK,
  ];

  const otherParticipants = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .where('currentCohortId', '==', participant.currentCohortId)
      .get()
  ).docs
    .map((doc) => doc.data() as ParticipantProfile)
    .filter((participant) =>
      activeStatuses.find((status) => status === participant.currentStatus),
    );

  // Build prompt
  // TODO: Include participant profile context in prompt
  const contextPrompt = await getPastStagesPromptContext(
    experimentId,
    stage.id,
    participant.privateId,
    true, // TODO: Use prompt settings for includeStageInfo
  );
  const currentStagePrompt = createAgentParticipantRankingStagePrompt(
    participant,
    stage,
    otherParticipants,
  );
  const prompt = `${contextPrompt}\n${currentStagePrompt}`;

  // Build generation config
  // TODO: Use generation config from agent persona prompt
  const generationConfig = createModelGenerationConfig();

  // TODO: Use structured output
  const rawResponse = await getAgentResponse(
    apiKeyConfig,
    prompt,
    participant.agentConfig.modelSettings,
    generationConfig,
  );
  const response = rawResponse.text ?? '';

  // Confirm that response is in expected format, e.g., list of strings
  try {
    // TODO: Use structured output
    const rankingList: string[] = response
      .split(',')
      .map((item) => item.trim());
    const participantAnswer = createRankingStageParticipantAnswer({
      id: stage.id,
      rankingList,
    });
    return participantAnswer;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
