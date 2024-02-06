/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Inject, Injectable } from '@angular/core';
import { VertexPalm2LLM } from '../../lib/text-templates/llm_vertexapi_palm2';
import { VertexEmbedder } from 'src/lib/text-embeddings/embedder_vertexapi';

// TODO: Unclear to me if this is needed or helpful...
//
// The value of having a service here is that the same LLM object can be used
// throughout the app.
@Injectable({
  providedIn: 'root',
})
export class VertexApiService {
  public llm: VertexPalm2LLM;
  public embedder: VertexEmbedder;

  constructor() {
    const project = localStorage.getItem('projectId') || 'no project set';
    const token = localStorage.getItem('accessToken') || 'no access token set';

    this.llm = new VertexPalm2LLM(project, token);
    this.embedder = new VertexEmbedder(project, token);
  }

  set accessToken(token: string) {
    console.log(`accessToken update ${token}.`);
    this.llm.accessToken = token;
    localStorage.setItem('accessToken', token);
  }
  get accessToken(): string {
    return this.llm.accessToken;
  }

  set projectId(project: string) {
    console.log(`projectId update ${project}.`);
    this.llm.projectId = project;
    localStorage.setItem('projectId', project);
  }
  get projectId(): string {
    return this.llm.projectId;
  }
}
