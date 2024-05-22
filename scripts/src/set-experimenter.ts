/** Set a user experimenter, or remove experimenter rights.
 * This command runs in production.
 * @usage npm run set-experimenter <email> <yes|no>
 */

import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import admin, { initializeApp } from './admin';

const changeExperimenterClaims = async (email: string, yes: boolean) => {
  initializeApp();

  // Try to find the given user
  let user: UserRecord | undefined;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    console.error(`User not found: ${email}`);
    return;
  }

  console.log(`User found: ${email}`);

  if (yes) {
    console.log('Granting experimenter rights...');
    await admin.auth().setCustomUserClaims(user.uid, { role: 'experimenter' });
    console.log('Experimenter rights granted!');
  } else {
    console.log('Removing experimenter rights...');
    await admin.auth().setCustomUserClaims(user.uid, {});
    console.log('Experimenter rights removed!');
  }
};

const email = process.argv[2];
const yes = process.argv[3];

if (!email || !yes) {
  console.error('Usage: npm run set-experimenter <email> <yes|no>');
  process.exit(1);
}

changeExperimenterClaims(email, yes === 'yes');
