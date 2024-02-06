/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
An class to wrap, and provide a common interface for LLM behaviour.
*/

import { SimpleError, isErrorResponse } from "../simple-errors/simple-errors";
import { Template, matchTemplate } from "./template";

export interface PredictResponse {
  completions: string[];
}

export interface ScoreRequest {
  query: string;
  completions: string[];
}
export interface ScoredCompletion {
  query: string;
  completion: string;
  score: number;
}
export interface ScoreResponse {
  scoredCompletions: ScoredCompletion[];
}

export abstract class LLM<Params extends {}> {
  public abstract name: string;

  abstract predict(prompt: string, params?: Params): Promise<PredictResponse | SimpleError>;
  // abstract score(request: ScoreRequest): Promise<ScoreResponse>;
}

// A Fake LLM that uses a lookup table of queries to give responses.
// It is deterministic, and if the query is not present, it returns no
// completions.
//
// TODO: maybe good to provide a version that takes the same query and gives difference responses each time, e.g. using a random seed at constructor time.
export class LookupTableFakeLLM implements LLM<{}> {
  public name: string = 'fake: in memory lookup table';

  constructor(public table: { [query: string]: ScoreResponse }) { }

  async predict(query: string): Promise<PredictResponse> {
    const scoreResponse = this.table[query]
    if (scoreResponse) {
      const predictResponse: PredictResponse = {
        completions: scoreResponse.scoredCompletions.map(c => c.completion)
      };
      return predictResponse;
    }
    throw new Error(`No matching entry for query: ${query}`);
    // return { queryCompletions: [] }
  }
  async score(request: ScoreRequest): Promise<ScoreResponse> {
    const scoreResponse: ScoreResponse = this.table[request.query]
    if (scoreResponse) {
      return scoreResponse;
    }
    return { scoredCompletions: [] }
  }
}

export interface InterpretedResponse<Ns extends string> {
  substs?: { [Key in Ns]: string }, responseStr: string
};

export async function fillTemplate<Ns extends string>(
  llm: LLM<{}>, template: Template<Ns>
): Promise<InterpretedResponse<Ns>[] | SimpleError> {
  const interpretedResponses = [] as InterpretedResponse<Ns>[];
  // const substsResponses: ({ [Key in Ns]: string } | null)[] = [];
  const parts = template.parts();
  const responses = await llm.predict(parts.prefix);
  if (isErrorResponse(responses)) {
    return responses;
  }
  // console.log('parts.prefix: ', parts.prefix);
  for (const completion of responses.completions) {
    // console.log('parts', parts);
    // console.log('qcompletion.completion', completion);
    const match = matchTemplate(parts, completion, false);
    const interpretedResponse = { responseStr: completion } as InterpretedResponse<Ns>;
    if (match) {
      interpretedResponse.substs = match.substs;
    }
    interpretedResponses.push(interpretedResponse)
  }
  return interpretedResponses;
}
