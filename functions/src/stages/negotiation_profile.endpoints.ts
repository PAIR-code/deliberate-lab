import {onCall} from 'firebase-functions/v2/https';
import {assignNegotiationProfilesToParticipants} from './negotiation_profile.utils';

// ************************************************************************* //
// setParticipantNegotiationProfiles endpoint                                //
//                                                                           //
// Randomly assign one of the stage's defined profiles (e.g. Party A/B/C) to //
// each of the active cohort participants.                                   //
// ************************************************************************* //
export const setParticipantNegotiationProfiles = onCall(async (request) => {
  const {data} = request;
  const experimentId = data.experimentId;
  const cohortId = data.cohortId;
  const stageId = data.stageId;

  return await assignNegotiationProfilesToParticipants(
    experimentId,
    cohortId,
    stageId,
  );
});
