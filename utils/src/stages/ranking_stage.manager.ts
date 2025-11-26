import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {createDefaultParticipantPrompt} from '../structured_prompt';
import {
  RankingItem,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  RankingType,
  createRankingStageParticipantAnswer,
} from './ranking_stage';
import {RANKING_STRUCTURED_OUTPUT_CONFIG} from './ranking_stage.prompts';
import {StageConfig, StageContextData} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class RankingStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    return {callApi: true, moveToNextStage: true};
  }

  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: RankingStageConfig,
    response: unknown,
  ) {
    try {
      const rankingList = response as string[];
      return createRankingStageParticipantAnswer({
        id: stage.id,
        rankingList,
      });
    } catch {
      return undefined;
    }
  }

  getDefaultParticipantStructuredPrompt(stage: RankingStageConfig) {
    const promptText =
      'Please rank the available items or participants based on the context above.';

    return {
      id: stage.id,
      type: stage.kind,
      prompt: createDefaultParticipantPrompt(promptText),
      includeScaffoldingInPrompt: true,
      generationConfig: createModelGenerationConfig(),
      structuredOutputConfig: RANKING_STRUCTURED_OUTPUT_CONFIG,
      numRetries: 3,
    };
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as RankingStageConfig;
    const getParticipantResponse = (
      participant: ParticipantProfileExtended,
    ) => {
      const context = stageContext.privateAnswers.find(
        (item) => item.participantPublicId === participant.publicId,
      );
      const answer = context?.answer as RankingStageParticipantAnswer;

      if (!context || !answer) return '';
      return `${context.participantDisplayName} (${context.participantPublicId})'s ranking: ${answer.rankingList}`;
    };

    const getParticipantResponses = () => {
      if (participants.length === 0) return '';
      return `\n${participants.map((p) => getParticipantResponse(p)).join('\n')}`;
    };

    switch (stage.rankingType) {
      case RankingType.ITEMS:
        const items = stage.rankingItems.map((item: RankingItem) => {
          return {id: item.id, text: item.text};
        });
        return `Items available in ranking stage: ${JSON.stringify(items)}${getParticipantResponses()}`;
      case RankingType.PARTICIPANTS:
        const rankingParticipants = stageContext.participants.map(
          (participant) => {
            return {id: participant.publicId, name: participant.name};
          },
        );
        return `Participants available in ranking stage: ${JSON.stringify(rankingParticipants)}${getParticipantResponses()}`;
      default:
        return '';
    }
  }
}
