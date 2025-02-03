import { Timestamp } from 'firebase-admin/firestore';
import {
  ParticipantProfileExtended,
} from '@deliberation-lab/utils';

/** Update participant's current stage to next stage (or end experiment). */
export function updateParticipantNextStage(
  participant: ParticipantProfileExtended, stageIds: string[]
) {
  let response = { currentStageId: null, endExperiment: false };

  const currentStageId = participant.currentStageId;
  const currentStageIndex = stageIds.indexOf(currentStageId);

  // Mark current stage as completed
  const timestamp = Timestamp.now();
  participant.timestamps.completedStages[currentStageId] = timestamp;

  // If at end of experiment
  if (currentStageIndex + 1 === stageIds.length) {
    // Update end of experiment fields
    participant.timestamps.endExperiment = timestamp;
    participant.currentStatus = ParticipantStatus.SUCCESS;
    response.endExperiment = true;
  } else {
    // Else, progress to next stage
    const nextStageId = stageIds[currentStageIndex + 1];
    participant.currentStageId = nextStageId;
    response.currentStageId = nextStageId;

    // Mark next stage as reached
    // (NOTE: this currently uses the participants' "completedWaiting" map)
    participant.timestamps.completedWaiting[nextStageId] = timestamp;

    // TODO: If all active participants have reached the next stage,
    // unlock that stage in CohortConfig
  }

  return response;
}
