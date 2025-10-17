import {RoleStagePublicData, StageKind} from '@deliberation-lab/utils';

import {
  getFirestoreActiveParticipants,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
} from '../utils/firestore';

import {app} from '../app';
/** Assign roles to participants for given stage. */
export async function assignRolesToParticipants(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  // Define role stage config
  const stage = await getFirestoreStage(experimentId, stageId);
  if (stage.kind !== StageKind.ROLE) {
    return {success: false};
  }

  // Define role stage public data document reference
  const publicDoc = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as RoleStagePublicData;

    // Get relevant (active, in cohort) participants
    const participants = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
      stageId,
    );

    // TODO: For each participant, check if they have been assigned a role
    // If not, assign role according to stage minimum/maximums
    const getRoleCounts = () => {
      const roleToFrequencyMap: Record<string, number> = {};
      Object.values(publicStageData.participantMap).forEach((role) => {
        roleToFrequencyMap[role] = (roleToFrequencyMap[role] ?? 0) + 1;
      });
      return roleToFrequencyMap;
    };
    const getNextRole = () => {
      const roleToFrequencyMap = getRoleCounts();
      // First, fill roles with minimum number of participants required
      for (const role of stage.roles) {
        const roleFrequency = roleToFrequencyMap[role.id] ?? 0;
        if (
          roleFrequency < role.minParticipants &&
          roleFrequency < role.maxParticipants
        ) {
          return role;
        }
      }
      // Otherwise, randomly pick role
      const availableRoles = stage.roles.filter(
        (role) =>
          (roleToFrequencyMap[role.id] ?? 0) < role.maxParticipants ||
          role.maxParticipants === null,
      );
      return availableRoles[Math.floor(Math.random() * availableRoles.length)];

      return null;
    };

    for (const participant of participants) {
      if (!publicStageData.participantMap[participant.publicId]) {
        publicStageData.participantMap[participant.publicId] =
          getNextRole()?.id ?? '';
      }
    }

    transaction.set(publicDoc, publicStageData);
  }); // end transaction

  return {success: true};
}
