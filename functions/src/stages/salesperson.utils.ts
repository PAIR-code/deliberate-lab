import {
  AgentChatPromptConfig,
  ChatMessage,
  ParticipantProfileBase,
  ParticipantProfileExtended,
  ProfileAgentConfig,
  SalespersonStagePublicData,
  buildBoardView,
  convertChatMessageToPromptFormat,
  getBaseStagePrompt,
  getParticipantProfilePromptContext,
  makeStructuredOutputPrompt,
  SALESPERSON_ROLE_RESPONDER_ID,
} from '@deliberation-lab/utils';
import {app} from '../app';

/** Utils for agents interacting with salesperson stage. */
// TODO: Move some of this to shared utils

/** Assemble salesperson stage prompt. */
export async function getSalespersonChatPrompt(
  experimentId: string,
  participantId: string, // private ID
  profile: ParticipantProfileBase,
  agentConfig: ProfileAgentConfig, // TODO: Add to params
  pastStageContext: string,
  chatMessages: ChatMessage[],
  promptConfig: AgentChatPromptConfig,
  stageConfig: ChatStageConfig,
) {
  return [
    // TODO: Move profile context up one level
    getParticipantProfilePromptContext(
      profile,
      agentConfig?.promptContext ?? '',
    ),
    pastStageContext,
    await getSalespersonStagePromptContext(
      experimentId,
      participantId,
      chatMessages,
      stageConfig,
      promptConfig.promptSettings.includeStageInfo,
    ),
    promptConfig.promptContext,
    makeStructuredOutputPrompt(promptConfig.structuredOutputConfig),
  ];
}

export async function getSalespersonStagePromptContext(
  experimentId: string,
  participantId: string, // private ID
  chatMessages: ChatMessage[],
  stageConfig: ChatStageConfig,
  includeStageInfo: boolean,
) {
  // TODO: Refactor board context into separate function

  const participant = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantId)
      .get()
  ).data() as ParticipantProfileExtended;
  const publicData = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stageConfig.id)
      .get()
  ).data() as SalespersonStagePublicData;
  // TODO: Make sure agent is always the "responder" role
  const board = buildBoardView(
    stageConfig.board,
    SALESPERSON_ROLE_RESPONDER_ID,
    publicData.moveHistory,
  );
  const boardForPrompt = board
    .map((row) =>
      row
        .map((cell) => (cell.content.length > 0 ? cell.content : '_'))
        .join(' '),
    )
    .join('\n');
  const boardContext = `\nThis is what you currently see (where _ means empty square, 🪙 means coin, 🚪 means exit, and 🙋 is your current position):\n\n${boardForPrompt}\n`;

  const moves = publicData.moveHistory.map(
    (move) => `${JSON.stringify(move.proposedCoord)}: ${move.status}`,
  );
  const moveContext = `\nThese were your previous moves:\n${moves}`;

  const prompt = [
    getBaseStagePrompt(stageConfig, includeStageInfo),
    moveContext,
    boardContext,
    chatMessages
      .map((message) => convertChatMessageToPromptFormat(message))
      .join('\n'),
  ].join('\n');
  return prompt;
}
