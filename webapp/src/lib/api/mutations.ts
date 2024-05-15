/** Tanstack angular mutations (not anymore, remove tanstack after this)
 */

import { ParticipantProfileBase } from '@llm-mediation-experiments/utils';

// TODO: put all these functions in the relevant repositories instead !

// ********************************************************************************************* //
//                                             DELETE                                            //
// ********************************************************************************************* //

import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';

/** Delete an experiment.
 * @rights Experimenter
 */
export const deleteExperiment = (experimentId: string) =>
  deleteDoc(doc(firestore, 'experiments', experimentId));

/** Delete a template.
 * @rights Experimenter
 */
export const deleteTemplate = (templateId: string) =>
  deleteDoc(doc(firestore, 'templates', templateId));

// ********************************************************************************************* //
//                                               CHAT                                            //
// ********************************************************************************************* //

/** Mark the given participant as ready to end the chat, or to go to the next pair
 * @rights Participant
 */
export const markReadyToEndChat = (experimentId: string, participantId: string, chatId: string) =>
  updateDoc(
    doc(firestore, 'experiments', experimentId, 'participants', participantId, 'chats', chatId),
    {
      readyToEndChat: true,
    },
  );

// ********************************************************************************************* //
//                                         PROFILE & TOS                                         //
// ********************************************************************************************* //

/** Update a participant's profile and acceptance of TOS.
 * @rights Participant
 */
export const updateTOSAndProfile = (
  experimentId: string,
  participantId: string,
  data: Partial<ParticipantProfileBase>,
) => updateDoc(doc(firestore, 'experiments', experimentId, 'participants', participantId), data);

// ********************************************************************************************* //
//                                             STAGES                                            //
// ********************************************************************************************* //

/** Update a participant's `workingOnStageName`
 * @rights Participant
 */
export const workOnStage = (experimentId: string, participantId: string, stageName: string) =>
  updateDoc(doc(firestore, 'experiments', experimentId, 'participants', participantId), {
    workingOnStageName: stageName,
  });
