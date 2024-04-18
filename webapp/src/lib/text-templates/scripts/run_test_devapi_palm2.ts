/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/* Test call makersuite.google.com developer API for Palm2 LLM.

Usage:

PALM2_GENAI_API_KEY="copy the api key from makersuite.google.com/app/apikey"
npx ts-node --esm ./run_test_devapi_palm2.ts \
  --apiKey=${PALM2_GENAI_API_KEY}

Where PALM2_GENAI_API_KEY envionment variable should be set before running,
e.g. copy/pasted from MakerSuite UI API Key section at
https://makersuite.google.com/app/apikey

Note: this will only work from IP addresses in supported countries.

*/
import { sendPalm2Request, preparePalm2Request } from '../llm_devapi_palm2';

import * as yargs from 'yargs';

interface Params {
  apiKey: string;
}

async function run(args: Params): Promise<void> {

  const prompt = `
The following are short movie summaries. They are specific, not generic (no movie is  just "a classic"), and they don't contain plot synopsis. They just describe my experience of the movie.

movie: 'Fifth Element'
summary: ['a joyous sci fi that emerses you in a colourful universe', 'quirky upbeat action']

movie: 'Seven Samurai'
summary: ['a black and white masterpiece of cinematography', 'a slow, atmospheric, symbolic fight for all that is just']

movie: 'The Godfather'
summary: ['
`;

  const request = preparePalm2Request(prompt);
  request.stop_sequences.push(`']`);
  const response = await sendPalm2Request(args.apiKey, request);
  console.log(JSON.stringify(response));
}

// ----------------------------------------------------------------------------
const args = yargs
  .option('apiKey', {
    describe: 'The API Key from MakerSuite UI. See: '
      + 'https://makersuite.google.com/app/apikey',
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
