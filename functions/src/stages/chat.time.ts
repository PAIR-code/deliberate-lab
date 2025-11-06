import {Timestamp} from 'firebase-admin/firestore';
import {
  ChatStageConfig,
  ChatStagePublicData,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {getFirestoreStagePublicDataRef} from '../utils/firestore';
import {sendSystemChatMessage} from '../chat/chat.utils';

/** Start tracking elapsed time. */
export async function startTimeElapsed(
  experimentId: string,
  cohortId: string,
  publicStageData: ChatStagePublicData,
) {
  // Exit if discussion has already ended.
  if (publicStageData.discussionEndTimestamp) return;

  // Update the start timestamp and checkpoint timestamp if not set.
  if (publicStageData.discussionStartTimestamp === null) {
    await getFirestoreStagePublicDataRef(
      experimentId,
      cohortId,
      publicStageData.id,
    ).update({
      discussionStartTimestamp: Timestamp.now(),
      discussionCheckpointTimestamp: Timestamp.now(),
    });
  }
}

/**
 * When chat public stage data is updated, update elapsed time
 * and potentially end the discussion.
 */
export async function updateTimeElapsed(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  publicStageData: ChatStagePublicData,
) {
  if (!stage.timeLimitInMinutes) return;
  const stageId = stage.id;

  // If discussion has ended, don't continue
  if (publicStageData.discussionEndTimestamp) {
    return;
  }

  if (!publicStageData.discussionStartTimestamp) {
    return;
  }

  // Calculate how long the discussion has been active
  const elapsedMinutes = getTimeElapsed(
    publicStageData.discussionStartTimestamp,
    'm',
  );

  // If elapsed time has reached/exceeded the limit, mark end
  const remainingTime = stage.timeLimitInMinutes - elapsedMinutes;
  if (remainingTime <= 0) {
    await handleTimeElapsed(experimentId, cohortId, stageId);
    return;
  }

  // Otherwise, continue to wait
  const maxWaitTimeInMinutes = 5;
  const intervalTime = Math.min(maxWaitTimeInMinutes, remainingTime);

  // Wait for the determined interval time, and then re-trigger the function.
  await new Promise((resolve) => setTimeout(resolve, intervalTime * 60 * 1000));

  // If time is now up, mark discussion as over
  if (remainingTime - intervalTime <= 0) {
    await handleTimeElapsed(experimentId, cohortId, stageId);
    return;
  }

  // Otherwise, write timestamp as discussion checkpoint to public stage data.
  // This will trigger the onPublicStageDataUpdated function and thus
  // call this function to re-evaluate elapsed time
  await getFirestoreStagePublicDataRef(experimentId, cohortId, stageId).update({
    discussionCheckpointTimestamp: Timestamp.now(),
  });
}

async function handleTimeElapsed(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  await sendSystemChatMessage(
    experimentId,
    cohortId,
    stageId,
    'The timer for this stage has ended; you can no longer respond.',
  );
  await getFirestoreStagePublicDataRef(experimentId, cohortId, stageId).update({
    discussionEndTimestamp: Timestamp.now(),
  });
}
