import { app } from '../app';

export const createParticipantUser = async (
  participantId: string,
  experimentId: string,
  name: string,
  chatIds: string[],
) => {
  const user = await app.auth().createUser({
    uid: participantId,
    email: `${participantId}@palabrate.com`,
    emailVerified: false,
    password: participantId,
    displayName: name,
    disabled: false,
  });

  // Add custom claims
  await app.auth().setCustomUserClaims(user.uid, {
    role: 'participant',
    participantId,
    experimentId,
    chatIds,
  });

  return user;
};
