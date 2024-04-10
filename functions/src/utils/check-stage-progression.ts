import { Value } from '@sinclair/typebox/value';
import { Progression } from '../validation/participants.validation';
import { Document } from './type-aliases';

/**
 * Checks if a participant's progress needs to be updated. Returns the original body data as well
 *
 * @param participant - The participant document that might need to be updated
 * @param body - The body of the request (potentially containing a new completed stage)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkStageProgression = (participant: Document, body: any) => {
  // Validate the body data
  if (Value.Check(Progression, body)) {
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

    return {
      ...rest,
      completedStageNames,
      futureStageNames,
      workingOnStageName,
    };
  }

  return body;
};
