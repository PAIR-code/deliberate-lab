/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Injectable } from '@angular/core';
// import { VertexPalm2LLM } from '../lib/text-templates/llm_vertexapi_palm2';
import { SimpleEmbedder } from 'src/lib/text-embeddings/embedder_api';
import { SimpleLlm } from 'src/lib/text-templates/llm_api';

// TODO: Unclear to me if this is needed or helpful...
//
// The value of having a service here is that the same LLM object can be used
// throughout the app.
@Injectable({
  providedIn: 'root',
})
export class LmApiService {
  public llm: SimpleLlm;
  public embedder: SimpleEmbedder;

  constructor() {
    this.embedder = new SimpleEmbedder();
    this.llm = new SimpleLlm({ candidateCount: 1 });
  }
}
