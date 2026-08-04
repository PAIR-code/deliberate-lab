import {
  NEGOTIATION_PROFILE_SET_ID,
  NegotiationProfileStagePublicData,
  ParticipantProfileExtended,
  StageKind,
} from '@deliberation-lab/utils';

import {
  getFirestoreActiveParticipants,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
} from '../utils/firestore';

import {app} from '../app';

/** Assign negotiation profiles to participants for given stage. */
export async function assignNegotiationProfilesToParticipants(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  const stage = await getFirestoreStage(experimentId, stageId);
  if (stage.kind !== StageKind.NEGOTIATION_PROFILE) {
    return {success: false};
  }

  const publicDoc = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  // Fetch all active participants in the cohort (without stageId filter) so
  // profiles are assigned in balanced order across cohort members even if
  // participants reach this stage at slightly different times or concurrently.
  const participants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
  );

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageDataSnapshot = await transaction.get(publicDoc);
    if (!publicStageDataSnapshot.exists) {
      return;
    }

    const publicStageData =
      publicStageDataSnapshot.data() as NegotiationProfileStagePublicData;

    if (!publicStageData.participantMap) {
      publicStageData.participantMap = {};
    }

    // Filter participants that need assignment
    const unassignedParticipants = participants.filter(
      (p) => !publicStageData.participantMap[p.publicId],
    );

    // Perform ALL reads before any writes (required by Firestore transactions)
    const participantSnapshots = await Promise.all(
      unassignedParticipants.map((p) => {
        const ref = app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .doc(p.privateId);
        return transaction.get(ref);
      }),
    );

    const getItemCounts = () => {
      const itemToFrequencyMap: Record<string, number> = {};
      Object.values(publicStageData.participantMap).forEach((itemId) => {
        itemToFrequencyMap[itemId] = (itemToFrequencyMap[itemId] ?? 0) + 1;
      });
      return itemToFrequencyMap;
    };

    const getNextItem = () => {
      const itemToFrequencyMap = getItemCounts();
      let minFreq = Infinity;
      for (const item of stage.items) {
        const freq = itemToFrequencyMap[item.id] ?? 0;
        if (freq < minFreq) {
          minFreq = freq;
        }
      }
      const availableItems = stage.items.filter(
        (item) => (itemToFrequencyMap[item.id] ?? 0) === minFreq,
      );
      if (availableItems.length === 0) {
        return stage.items[0];
      }
      return availableItems[0];
    };

    // Perform WRITES
    for (let i = 0; i < unassignedParticipants.length; i++) {
      const participant = unassignedParticipants[i];
      const participantDoc = participantSnapshots[i];
      const nextItem = getNextItem();
      if (nextItem) {
        publicStageData.participantMap[participant.publicId] = nextItem.id;

        if (participantDoc.exists) {
          const pData = participantDoc.data() as ParticipantProfileExtended;
          if (!pData.anonymousProfiles) {
            pData.anonymousProfiles = {};
          }
          pData.anonymousProfiles[NEGOTIATION_PROFILE_SET_ID] = {
            name: nextItem.name,
            avatar: pData.avatar || nextItem.avatar || '',
            repeat: 0,
          };
          const participantRef = app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('participants')
            .doc(participant.privateId);
          transaction.set(participantRef, pData);
        }
      }
    }

    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
}
