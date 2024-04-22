import { app } from '../app';

export const createParticipantUser = async (
  participantId: string,
  name: string,
  chatIds: string[],
) => {
  const user = await app.auth().createUser({
    uid: participantId,
    email: `${participantId}@palabrate`,
    emailVerified: false,
    password: participantId,
    displayName: name,
    disabled: false,
  });

  // Add custom claims
  await app.auth().setCustomUserClaims(user.uid, {
    role: 'participant',
    participantId,
    chatIds,
  });

  return user;
};
