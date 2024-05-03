/** Development environment configuration */

import { firebaseConfig } from 'src/lib/api/firebase-config';

export const environment = {
  production: false,
  cloudFunctionsUrl: `http://localhost:5001/${firebaseConfig.projectId}/us-central1`,
};
