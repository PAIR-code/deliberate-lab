/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Embedder, Embedding, EmbedError } from "./embedder";

interface EmbedRequest {
  text: string
}

async function sendEmbedRequest(request: EmbedRequest): Promise<Embedding | EmbedError> {
  // Default options are marked with *
  // try {
  const response = await fetch(`/api/embed`, {
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
    body: JSON.stringify(request), // body data type must match "Content-Type" header
  });
  // parses JSON response into native JavaScript objects
  if (response.status !== 200) {
    console.error(response.statusText);
    return { error: `fetch request failed (${response.status}): ${response.statusText}` };
  }
  return (await response.json() as Embedding | EmbedError);
  // } catch (e: unknown) {
  //   console.error(e);
  //   return { error: `fetch request failed: ${(e as Error).message}` };
  // }
}

export class SimpleEmbedder implements Embedder<{}> {
  public name: string;
  constructor() {
    this.name = `SimpleEmbedder`
  }
  async embed(
    text: string, params?: {}
  ): Promise<Embedding | EmbedError> {
    const apiResponse = await sendEmbedRequest({ text });
    return apiResponse
  }
}
