/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, effect } from '@angular/core';
import { FormControl } from '@angular/forms';
import { VertexApiService } from '../../services/vertex-api.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { preparePalm2Request, sendPalm2Request } from 'src/lib/text-templates/llm_vertexapi_palm2';

@Component({
  selector: 'app-llm-api-config',
  templateUrl: './llm-api-config.component.html',
  styleUrls: ['./llm-api-config.component.scss'],
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
})
export class LlmApiConfigComponent {
  public tokenControl: FormControl<string | null>;
  public projectControl: FormControl<string | null>;

  constructor(private llmService: VertexApiService) {
    this.tokenControl = new FormControl<string | null>(this.llmService.accessToken);
    this.projectControl = new FormControl<string | null>(this.llmService.projectId);

    this.tokenControl.valueChanges.forEach(update => {
      if (update && this.llmService.accessToken !== update) {
        this.llmService.accessToken = update
      }
    });
    this.projectControl.valueChanges.forEach(update => {
      if (update && this.llmService.projectId !== update) {
        this.llmService.projectId = update
      }
    });
  }
  // The Token is valid for 1 hour! Don't forget to renew it!
  async sendRequest() {
    const prompt = `Hello word`;
    const request = preparePalm2Request(prompt);
    console.log(JSON.stringify(request));
    console.log(this.llmService.projectId);
    console.log(this.llmService.accessToken);
    const response = await sendPalm2Request(
      this.llmService.projectId, this.llmService.accessToken, request);
    console.log(JSON.stringify(response));
  };
}