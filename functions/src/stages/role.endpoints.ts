import {
  RoleItem,
  RoleStageConfig,
  RoleStagePublicData,
  StageKind,
} from '@deliberation-lab/utils';

import {
  getFirestoreActiveParticipants,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
} from '../utils/firestore';
import {assignRolesToParticipants} from './role.utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';

// ************************************************************************* //
// setParticipantRoles endpoint                                              //
//                                                                           //
// Randomly assign one of the stage's defined roles to each of the active    //
// cohort participants.                                                      //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId                                         //
// }                                                                         //
// Validation: utils/src/role_stage.validation.ts                            //
// ************************************************************************* //
export const setParticipantRoles = onCall(async (request) => {
  const {data} = request;
  const experimentId = data.experimentId;
  const cohortId = data.cohortId;
  const stageId = data.stageId;

  return await assignRolesToParticipants(experimentId, cohortId, stageId);
});
