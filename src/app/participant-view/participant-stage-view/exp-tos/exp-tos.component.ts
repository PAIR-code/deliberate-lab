/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [MatCheckboxModule],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss',
})
export class ExpTosComponent {
  constructor() {}

  updateCheckboxValue(_updatedValue: MatCheckboxChange) {
    // TODO: mutation with the new backend
    // const checked = updatedValue.checked;
    // if (checked) {
    //   this.stageData.acceptedTosTimestamp = new Date();
    // } else {
    //   this.stageData.acceptedTosTimestamp = null;
    // }
    // this.participant.editStageData(() => this.stageData);
  }
}
