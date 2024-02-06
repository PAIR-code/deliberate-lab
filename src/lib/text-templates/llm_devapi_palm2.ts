/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
// TODO: make more like VertexAI setup
Google Generative AI Developer API
(same models as VertexAPI but different API)
*/

export type HarmName =
  | 'HARM_CATEGORY_DEROGATORY'
  | 'HARM_CATEGORY_TOXICITY'
  | 'HARM_CATEGORY_VIOLENCE'
  | 'HARM_CATEGORY_SEXUAL'
  | 'HARM_CATEGORY_MEDICAL'
  | 'HARM_CATEGORY_DANGEROUS';
interface HarmFilterSetting {
  category: HarmName;
  threshold: 1 | 2 | 3 | 4 | 5;
}

export interface Palm2ApiRequest {
  prompt: { text: string };
  temperature: number;
  top_k: number;
  top_p: number;
  candidate_count: number;
  max_output_tokens: number;
  stop_sequences: string[];
  safety_settings: HarmFilterSetting[];
}
export type Palm2RequestOptions = Omit<Partial<Palm2ApiRequest>, 'prompt'>;

export interface Palm2Response { }

export function preparePalm2Request(text: string, options?: Palm2RequestOptions): Palm2ApiRequest {
  return {
    prompt: { text },
    temperature: (options && options.temperature) || 0.7,
    top_k: (options && options.top_k) || 40,
    top_p: (options && options.top_p) || 0.95,
    candidate_count: (options && options.candidate_count) || 4,
    max_output_tokens: (options && options.max_output_tokens) || 256,
    stop_sequences: (options && options.stop_sequences) || [],
    safety_settings: (options && options.safety_settings) || [
      { category: 'HARM_CATEGORY_DEROGATORY', threshold: 1 },
      { category: 'HARM_CATEGORY_TOXICITY', threshold: 1 },
      { category: 'HARM_CATEGORY_VIOLENCE', threshold: 1 },
      { category: 'HARM_CATEGORY_SEXUAL', threshold: 1 },
      { category: 'HARM_CATEGORY_MEDICAL', threshold: 1 },
      { category: 'HARM_CATEGORY_DANGEROUS', threshold: 1 },
    ],
  };
}

async function postDataToLLM(url = '', data: Palm2ApiRequest) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

export async function sendPalm2Request(
  apiKey: string, // e.g. as copied from UI in makerSuite.google.com
  req: Palm2ApiRequest,
  modelId = 'text-bison-001',  // e.g. 'models/text-bison-001';
): Promise<Palm2Response> {
  return postDataToLLM(
    `https://generativelanguage.googleapis.com/v1beta2/models/${modelId}:generateText?key=${apiKey}`,
    req
  );
  // .then((data) => {
  //   console.log(data); // JSON data parsed by `data.json()` call
  // })
  // .catch((err) => console.error(err));
}
