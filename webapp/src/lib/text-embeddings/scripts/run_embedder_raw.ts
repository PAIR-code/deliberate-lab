/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/* Test call to The Google-Cloud-Vertex-AI-API Palm2 LLM.

Usage:

npx ts-node --esm ./run_embedder_raw.ts \
  --project=$(gcloud config get-value project) \
  --accessToken=$(gcloud auth print-access-token)
*/
import { sendEmbedRequest, prepareEmbedRequest } from '../embedder_vertexapi';

import * as yargs from 'yargs';

interface Params {
  accessToken: string,
  project: string,
  model: string,
}

async function run(args: Params): Promise<void> {
  const text = `I am a hungry hippo`;
  const request = prepareEmbedRequest(text);
  const response = await sendEmbedRequest(
    args.project, args.accessToken, request);
  console.log(JSON.stringify(response));
}

// ----------------------------------------------------------------------------
const args = yargs
  .option('accessToken', {
    describe: 'Google Cloud Auth Token ' +
      'e.g. echo $(gcloud auth print-access-token)',
    demandOption: true,
    type: 'string',
  }).option('project', {
    describe: 'The Google Cloud Project to use (it must have the VertexAI ' +
      'API enabled).',
    demandOption: true,
    type: 'string',
  }).option('model', {
    describe: 'The Google Cloud Project to use (it must have the VertexAI ' +
      'API enabled).',
    default: 'textembedding-gecko',
    type: 'string',
  }).help().argv;

run(args as Params)
  .then(() => {
    console.log('Success!');
  })
  .catch(e => {
    console.error('Failed: ', e);
    throw Error('Failed');
  });
