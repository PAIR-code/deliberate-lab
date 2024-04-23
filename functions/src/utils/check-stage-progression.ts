import { app } from '../app';
import { Progression } from '../validation/participants.validation';
import { Document } from './type-aliases';

/**
 * Checks if a participant's progress needs to be updated. Returns the original body data as well.
 *
 * Internally, if the stage needs to be changed, it will update the corresponding `participants_progressions`
 * document entry in Firestore.
 *
 * @param participant - The participant document that might need to be updated
 * @param body - The body of the request (potentially containing a new completed stage)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkStageProgression = <T extends Progression>(participant: Document, body: T) => {
  // Validate the body data
  if (body.justFinishedStageName) {
    const data = participant.data();
    if (!data) return body;

    const { justFinishedStageName, ...rest } = body;
    if (data.completedStageNames.includes(justFinishedStageName)) return {};

    // Rebuild the `completedStageNames` -> `workingOnStageName` -> `futureStageNames` sequence
    const index = data.futureStageNames.indexOf(justFinishedStageName);
    const completedStageNames = [
      ...data.completedStageNames,
      data.workingOnStageName,
      ...data.futureStageNames.slice(0, index + 1),
    ];
    const futureStageNames = data.futureStageNames.slice(index + 2);
    const workingOnStageName =
      data.futureStageNames[0] ?? completedStageNames[completedStageNames.length - 1];

    // Update the `participants_progressions` document
    updateParticipantProgression(data.experimentId, participant.id, workingOnStageName);

    return {
      ...rest,
      completedStageNames,
      futureStageNames,
      workingOnStageName,
    };
  }

  delete body.justFinishedStageName; // Just in case it is defined with `undefined` as a value
  return body;
};

const updateParticipantProgression = (
  experimentId: string,
  participantId: string,
  workingOnStageName: string,
) => {
  // Update the `participants_progressions` document
  const progressionRef = app.firestore().doc(`participants_progressions/${experimentId}`);

  progressionRef.update({
    [`progressions.${participantId}`]: workingOnStageName,
  });
};
