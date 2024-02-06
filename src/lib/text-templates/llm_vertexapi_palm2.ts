/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
Google Cloud Vertex Palm2 API
See: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/text
(same models as Google Generative AI Developer API but different API)
*/

import { LLM, PredictResponse } from "./llm";

export interface Palm2ApiParams {
  candidateCount?: number, // 1 to 8
  maxOutputTokens?: number, // 256, 1024
  stopSequences?: string[], // e.g. ']
  temperature?: number,  // e.g. 0.2 (0=deterministic, 1=wild, x>1=crazy)
  topP?: number,  // e.g. 0.8 (0-1, smaller = restricts crazyiness)
  topK?: number  // e.g. 40 (0-numOfTokens, smaller = restricts crazyiness)
}

// The underlying Google Cloud Vertex AI LLM API
export interface Palm2ApiRequest {
  instances: { content: string }[]
  parameters: Palm2ApiParams
}
export type Palm2RequestOptions = Omit<Partial<Palm2ApiRequest>, 'prompt'>;

export interface Palm2Response {
  predictions:
  {
    content: string,
    citationMetadata: {
      citations: {}[]
    },
    safetyAttributes: {
      blocked: boolean, categories: {}[], scores: {}[]
    }
  }[],
  metadata: {
    tokenMetadata: {
      outputTokenCount: {
        totalBillableCharacters: number,
        totalTokens: number
      },
      inputTokenCount: {
        totalBillableCharacters: number,
        totalTokens: number
      },
    }
  }
}

export function preparePalm2Request(
  text: string, options?: Palm2ApiParams
): Palm2ApiRequest {
  return {
    instances: [{ content: text }],
    parameters: {
      temperature: (options && options.temperature) || 0.7,
      topK: (options && options.topK) || 40,
      topP: (options && options.topP) || 0.95,
      candidateCount: (options && options.candidateCount) || 4,
      maxOutputTokens: (options && options.maxOutputTokens) || 256,
      stopSequences: (options && options.stopSequences) || [],
    }
  };
}

async function postDataToLLM(url = '', accessToken: string, data: Palm2ApiRequest) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

export async function sendPalm2Request(
  projectId: string,
  accessToken: string,
  req: Palm2ApiRequest,
  modelId = 'text-bison', // e.g. text-bison for latest text-bison model
  apiEndpoint = 'us-central1-aiplatform.googleapis.com',
): Promise<Palm2Response> {
  return postDataToLLM(
    // TODO: it may be that the url part 'us-central1' has to match
    // apiEndpoint.
    `https://${apiEndpoint}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:predict`,
    accessToken,
    req
  );
  // .then((data) => {
  //   console.log(data); // JSON data parsed by `data.json()` call
  // })
  // .catch((err) => console.error(err));
}

export interface Palm2ApiOptions {
  modelId: string,
  apiEndpoint: string,
  requestParameters: Palm2ApiParams
}

export class VertexPalm2LLM implements LLM<Palm2ApiOptions> {
  public name: string;
  public defaultOptions: Palm2ApiOptions = {
    modelId: 'text-bison',
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    requestParameters: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      candidateCount: 4,
      maxOutputTokens: 256,
      stopSequences: [],
    }
  };

  constructor(
    public projectId: string,
    public accessToken: string,
  ) {
    this.name = `VertexLLM:` + this.defaultOptions.modelId;
  }

  //
  async predict(
    query: string, params?: Palm2ApiOptions
  ): Promise<PredictResponse> {

    const apiParams = params ? params.requestParameters
      : this.defaultOptions.requestParameters;
    const apiRequest: Palm2ApiRequest = {
      instances: [{ content: query }],
      parameters: apiParams
    }

    const apiResponse = await sendPalm2Request(
      this.projectId,
      this.accessToken,
      apiRequest,
      this.defaultOptions.modelId,
      this.defaultOptions.apiEndpoint);

    // HACKING around an API bug. :(
    //
    // The API doesn't include the actual stop sequence that it found, so we
    // can never know the true stop seqeunce, so we just pick the first one,
    // and image it is that.
    //
    // A bug has been filed.
    let imaginedPostfixStopSeq = '';
    if (apiParams.stopSequences && apiParams.stopSequences.length > 0) {
      imaginedPostfixStopSeq = apiParams.stopSequences[0];
    }

    if (!apiResponse.predictions) {
      throw new Error(`No predictions resturned in api response:` +
        ` ${JSON.stringify(apiResponse, null, 2)}`);
    }

    // TODO: skip this and simplify?
    const scoredCompletions = apiResponse.predictions.map(p => {
      return {
        query: query,
        completion: p.content + imaginedPostfixStopSeq,
        score: 1, // TODO: API doesn't provide this, so we fake it as always 1.
      }
    });

    return { completions: scoredCompletions.map(c => c.completion) }
  }

  // TODO: The cloud API doesn't currently support scoring.
  // async score(request: ScoreRequest): Promise<ScoreResponse> {
  // }

}
