import {
  AgentModelSettings,
  ModelGenerationConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  createAgentConfig,
  createAgentParticipantRankingStagePrompt,
  createModelGenerationConfig,
  createRankingStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {getAgentResponse} from '../agent.utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';

/** Use LLM call to generate agent participant response to ranking stage. */
export async function getAgentParticipantRankingStageResponse(
  experimentId: string,
  experimenterData: ExperimenterData, // for making LLM call
  participant: ParticipantProfileExtended,
  stage: RankingStageConfig,
) {
  // If participant is not an agent, return
  if (!participant.agentConfig) {
    return;
  }

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
  const prompt = createAgentParticipantRankingStagePrompt(
    participant,
    stage,
    otherParticipants,
  );
  // Build generation config
  const generationConfig = createModelGenerationConfig();

  // Call LLM API
  const response = await getAgentResponse(
    experimenterData,
    prompt,
    participant.agentConfig.modelSettings,
    generationConfig,
  );

  // Check console log for response
  console.log(
    'TESTING AGENT PARTICIPANT PROMPT FOR RANKING STAGE\n',
    `Experiment: ${experimentId}\n`,
    `Participant: ${participant.publicId}\n`,
    `Stage: ${stage.name} (${stage.kind})\n`,
    response,
  );

  // Confirm that response is in expected format, e.g., list of strings
  try {
    const rankingList = JSON.stringify(response) as string[];
    const participantAnswer = createRankingStageParticipantAnswer({
      id: stage.id,
      rankingList,
    });
    console.log(
      '✅ RankingStageParticipantAnswer\n',
      JSON.stringify(participantAnswer),
    );
  } catch (error) {
    console.log(error);
  }

  return response;
}
