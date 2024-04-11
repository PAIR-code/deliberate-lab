/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { bytes, describeBytes } from 'src/lib/utils/string.utils';
import { ConfigUpdate } from '../codemirror-config-editor/codemirror-config-editor.component';
import { CodemirrorConfigEditorModule } from '../codemirror-config-editor/codemirror-config-editor.module';
import { GoogleAuthService } from '../services/google-auth.service';
import { GoogleDriveAppdataService } from '../services/google-drive-appdata.service';

export interface SavedAppData {
  // TODO: define the export schema for a full experiment
}

@Component({
  selector: 'app-app-settings',
  standalone: true,
  imports: [
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressBarModule,
    CodemirrorConfigEditorModule,
    MatIconModule,
  ],
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss'],
})
export class AppSettingsComponent {
  public appNameControl: FormControl<string | null>;

  public defaultDataStr: string = JSON.stringify({}, null, 2);
  public currentDataStr: string = this.defaultDataStr.slice();

  public downloadUrl?: string;
  public waiting: boolean = false;
  public errorMessage?: string;
  public errorCount: number = 0;

  public usersList: string[] = [];

  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;

  constructor(
    private driveService: GoogleDriveAppdataService,
    private authService: GoogleAuthService,
  ) {
    this.appNameControl = new FormControl<string | null>('Default app name');
  }

  reset() {
    this.appNameControl.setValue('Default app name');
    this.currentDataStr = this.defaultDataStr.slice();
  }

  async saveToGoogleDrive() {
    const json = this.currentDataStr;
    const token = await this.authService.getToken(
      'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
    );

    const response = await this.driveService.saveData(
      json,
      `${this.appNameControl.value}.json`,
      '',
      token,
    );

    console.log('saveToGoogleDrive:response', response);
  }

  download(anchorLink: HTMLAnchorElement) {
    const json = this.currentDataStr;
    const blob = new Blob([json], { type: 'data:application/json;charset=utf-8' });
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
    this.downloadUrl = URL.createObjectURL(blob);
    anchorLink.href = this.downloadUrl;
    anchorLink.click();
    // window.open(this.downloadUrl, '_top');
  }

  downloadName() {
    return `${this.appNameControl.value}.json`;
  }

  configUpdated(update: ConfigUpdate<unknown>) {
    // When configUpdate has a new object, we assume it to be correct.
    //
    // TODO: provide some runtime value type checking. Right now all that is
    // needed is valid JSON/JSON5, but if you provide valid JSON missing needed
    // values (e.g. encoderConfig is null), it should complain here, but
    // currently does not.
    const configUpdate = update as ConfigUpdate<SavedAppData>;

    if (configUpdate.error || !configUpdate.obj || !configUpdate.json) {
      console.log(`configUpdated with no update: ${configUpdate}`);
      return;
    }

    this.currentDataStr = configUpdate.json;
  }

  sizeString() {
    return describeBytes(bytes(this.currentDataStr));
  }
}
