import { ParticipantProfile } from '@llm-mediation-experiments/utils';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Expose participant profile and workingOnStageName changes publicly in the parent experiment document */
export const publishParticipantProfile = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}',
  async (event) => {
    const data = event.data?.after.data() as ParticipantProfile | undefined;
    if (!data) return;

    const experiment = app.firestore().doc(`experiments/${event.params.experimentId}`);

    experiment.update({
      [`participants.${data.publicId}`]: data,
    });
  },
);
