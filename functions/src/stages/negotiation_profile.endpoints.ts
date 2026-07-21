import {Value} from '@sinclair/typebox/value';
import {SetParticipantNegotiationProfilesData} from '@deliberation-lab/utils';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {assignNegotiationProfilesToParticipants} from './negotiation_profile.utils';
import {prettyPrintError} from '../utils/validation';

// ************************************************************************* //
// setParticipantNegotiationProfiles endpoint                                //
//                                                                           //
// Randomly assign one of the stage's defined profiles (e.g. Party A/B/C) to //
// each of the active cohort participants.                                   //
//                                                                           //
// Input structure: { experimentId, cohortId, stageId }                      //
// Validation: utils/src/stages/negotiation_profile_stage.validation.ts      //
// ************************************************************************* //
export const setParticipantNegotiationProfiles = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SetParticipantNegotiationProfilesData, data);
  if (!validInput) {
    for (const error of Value.Errors(
      SetParticipantNegotiationProfilesData,
      data,
    )) {
      prettyPrintError(error);
    }
    throw new HttpsError('invalid-argument', 'Invalid data');
  }

  return await assignNegotiationProfilesToParticipants(
    data.experimentId,
    data.cohortId,
    data.stageId,
  );
});
