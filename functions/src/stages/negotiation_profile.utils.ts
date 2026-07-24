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

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageDataSnapshot = await transaction.get(publicDoc);
    const publicStageData =
      publicStageDataSnapshot.data() as NegotiationProfileStagePublicData;

    const participants = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
      stageId,
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
        return stage.items[Math.floor(Math.random() * stage.items.length)];
      }
      return availableItems[Math.floor(Math.random() * availableItems.length)];
    };

    for (const participant of participants) {
      if (!publicStageData.participantMap[participant.publicId]) {
        const nextItem = getNextItem();
        if (nextItem) {
          publicStageData.participantMap[participant.publicId] = nextItem.id;

          const participantRef = app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('participants')
            .doc(participant.privateId);

          const participantDoc = await transaction.get(participantRef);
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
            transaction.set(participantRef, pData);
          }
        }
      }
    }

    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
}
