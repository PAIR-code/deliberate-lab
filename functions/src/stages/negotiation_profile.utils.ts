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

    // Perform ALL reads before any writes (required by Firestore transactions).
    // Read every active participant (not only unassigned ones) so we can also
    // repair any participant whose anonymousProfiles identity has drifted out of
    // sync with the authoritative participantMap.
    const participantSnapshots = await Promise.all(
      participants.map((p) => {
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

    const itemById = new Map(stage.items.map((item) => [item.id, item]));

    // Perform WRITES. Assign an item to any unassigned participant, then ensure
    // every participant's anonymousProfiles identity (used by the chat and
    // profile display) matches their participantMap assignment.
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const participantDoc = participantSnapshots[i];

      if (!publicStageData.participantMap[participant.publicId]) {
        const nextItem = getNextItem();
        if (nextItem) {
          publicStageData.participantMap[participant.publicId] = nextItem.id;
        }
      }

      const assignedItem = itemById.get(
        publicStageData.participantMap[participant.publicId],
      );
      if (!assignedItem || !participantDoc.exists) {
        continue;
      }

      const pData = participantDoc.data() as ParticipantProfileExtended;
      const existingProfile =
        pData.anonymousProfiles?.[NEGOTIATION_PROFILE_SET_ID];
      if (existingProfile?.name === assignedItem.name) {
        continue; // Already in sync; nothing to write.
      }

      if (!pData.anonymousProfiles) {
        pData.anonymousProfiles = {};
      }
      pData.anonymousProfiles[NEGOTIATION_PROFILE_SET_ID] = {
        name: assignedItem.name,
        avatar: pData.avatar || '',
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

    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
}
