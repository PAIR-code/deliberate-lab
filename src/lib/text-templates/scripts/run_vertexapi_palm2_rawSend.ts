/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/* Test call to The Google-Cloud-Vertex-AI-API Palm2 LLM.

Usage:

npx ts-node --esm ./run_vertexapi_palm2_rawSend.ts \
  --project=$(gcloud config get-value project) \
  --accessToken=$(gcloud auth print-access-token)
*/
import { sendPalm2Request, preparePalm2Request } from '../llm_vertexapi_palm2';

import * as yargs from 'yargs';

interface Params {
  accessToken: string,
  project: string,
}

async function run(args: Params): Promise<void> {

  const prompt = `
The following are short movie summaries. They are specific, not generic (no movie is just "a classic"), and they don't contain plot synopsis. They just describe the experience of watching the movie. It tries to tell you the essence of the movie.

movie: 'Fifth Element'
summary: ['joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']

movie: 'Seven Samurai'
summary: ['black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']

movie: 'The Godfather'
summary: ['
`;

  const request = preparePalm2Request(prompt);
  request.parameters.stopSequences.push(`']`);
  const response = await sendPalm2Request(
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
  }).help().argv;

run(args as Params)
  .then(() => {
    console.log('Success!');
  })
  .catch(e => {
    console.error('Failed: ', e);
    throw Error('Failed');
  });
