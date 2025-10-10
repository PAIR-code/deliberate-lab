import {
  ParticipantProfileExtended,
  SalespersonStagePublicData,
  buildBoardView,
  SALESPERSON_ROLE_RESPONDER_ID,
} from '@deliberation-lab/utils';
import {app} from '../app';

export async function getSalespersonStageBoardContext(
  experimentId: string,
  participantId: string, // private ID
  stageConfig: ChatStageConfig,
) {
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

  return `${moveContext}\n${boardContext}`;
}
