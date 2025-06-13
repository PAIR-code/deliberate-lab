import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {StageKind} from '@deliberation-lab/utils';
import {
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {updateTimeElapsed} from './chat.time';

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
      default:
        break;
    }
  },
);
