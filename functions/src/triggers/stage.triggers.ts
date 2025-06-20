import {
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {StageKind} from '@deliberation-lab/utils';
import {
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {updateTimeElapsed} from '../stages/chat.time';
import {updateCurrentChatDiscussionId} from '../stages/chat.utils';
import {updateChipTurn} from '../stages/chip.utils';
import {addParticipantAnswerToRankingStagePublicData} from '../stages/ranking.utils';
import {addParticipantAnswerToSurveyStagePublicData} from '../stages/survey.utils';

/** When participant (private) stage data is updated. */
export const onParticipantStageDataUpdated = onDocumentWritten(
  {
    document:
      'experiments/{experimentId}/participants/{participantId}/stageData/{stageId}',
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data.after.data() as StageParticipantAnswer | undefined;
    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );
    if (!stage || !participant) return;

    switch (stage.kind) {
      case StageKind.CHAT:
        updateCurrentChatDiscussionId(
          event.params.experimentId,
          stage,
          participant,
          data,
        );
        break;
      case StageKind.RANKING:
        addParticipantAnswerToRankingStagePublicData(
          event.params.experimentId,
          stage,
          participant,
          data,
        );
        break;
      case StageKind.SURVEY:
        addParticipantAnswerToSurveyStagePublicData(
          event.params.experimentId,
          stage,
          participant,
          data,
        );
        break;
      default:
        break;
    }
  },
);

/** When public stage data is updated. */
export const onPublicStageDataUpdated = onDocumentUpdated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/',
    timeoutSeconds: 360, // Maximum timeout of 6 minutes.
  },
  async (event) => {
    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) return;

    const publicStageData = await getFirestoreStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    if (!publicStageData) return;

    switch (stage.kind) {
      case StageKind.CHAT:
        // Update elapsed time and potentially end the discussion
        updateTimeElapsed(
          event.params.experimentId,
          event.params.cohortId,
          stage,
          publicStageData,
        );
        break;
      case StageKind.CHIP:
        // Update chip round/turn if applicable
        updateChipTurn(
          event.params.experimentId,
          event.params.cohortId,
          stage,
          publicStageData,
        );
        break;
      default:
        break;
    }
  },
);
