import {
  ExperimenterData,
  ModelResponseStatus,
  ParticipantProfileExtended,
  StageKind,
  StructuredOutputDataType,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  createDefaultPromptFromText,
  createModelGenerationConfig,
  createStructuredOutputConfig,
  DEFAULT_AGENT_PARTICIPANT_RANKING_ITEMS_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_RANKING_PARTICIPANTS_PROMPT,
} from '@deliberation-lab/utils';

import {processModelResponse} from '../agent.utils';
import {getStructuredPrompt} from '../prompt.utils';
import {getFirestoreParticipantAnswerRef} from '../utils/firestore';

import {app} from '../app';

const RANKING_STRUCTURED_OUTPUT_CONFIG = createStructuredOutputConfig({
  schema: {
    type: StructuredOutputDataType.ARRAY,
    description:
      'An ordered list of IDs ranked from most preferred to least preferred',
    arrayItems: {
      type: StructuredOutputDataType.STRING,
      description: 'The ID of the participant being ranked',
    },
  },
});

export async function completeRankingStageAsAgentParticipant(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageConfig: RankingStageConfig,
  experimenterData: ExperimenterData | undefined,
) {
  if (!experimenterData) {
    // Log that experimenter data / API key is missing
    return;
  }
  const agentConfig = participant.agentConfig;
  const promptText =
    'Please rank the available items or participants based on the context above.';

  const promptConfig: BasePromptConfig = {
    id: stageConfig.id,
    type: stageConfig.kind,
    prompt: createDefaultPromptFromText(promptText),
    generationConfig: createModelGenerationConfig(),
    structuredOutputConfig: RANKING_STRUCTURED_OUTPUT_CONFIG,
    numRetries: 3,
  };
  const structuredPrompt = await getStructuredPrompt(
    experimentId,
    participant.currentCohortId,
    /*participantIds=*/ [participant.privateId],
    stageConfig.id,
    participant,
    agentConfig,
    promptConfig,
  );

  const response = await processModelResponse(
    experimentId,
    participant.currentCohortId,
    /*participantId=*/ participant.privateId,
    stageConfig.id,
    participant,
    participant.publicId,
    participant.privateId,
    /*description=*/ '',
    experimenterData.apiKeys,
    structuredPrompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
    promptConfig.numRetries ?? 0,
  );

  if (response.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return;
  }

  if (!response.parsedResponse) {
    // Response is already logged in console during Gemini API call
    console.log('Could not parse JSON!');
    return;
  }

  // TODO: Update ranking stage document
  try {
    const answer: RankingStageParticipantAnswer = {
      id: stageConfig.id,
      kind: StageKind.RANKING,
      rankingList: response.parsedResponse,
    };

    // Define document reference
    const ref = getFirestoreParticipantAnswerRef(
      experimentId,
      participant.privateId,
      stageConfig.id,
    );

    // Run document write as transaction to ensure consistency
    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(ref, answer);
    });
  } catch (e: Error) {
    console.log(e);
  }
}
