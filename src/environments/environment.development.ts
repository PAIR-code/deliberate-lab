/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { driveApiKey, oauthClientId, sheetsApiKey } from './gcloud_env';

export const environment = {
  oauthClientId,
  sheetsApiKey,
  driveApiKey,

  // Development local addresses
  cloudFunctionsUrl: 'http://127.0.0.1:5001/llm-mediator-political/us-central1',
};
