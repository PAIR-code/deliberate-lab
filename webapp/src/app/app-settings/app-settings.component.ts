/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, effect, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ConfigUpdate } from '../codemirror-config-editor/codemirror-config-editor.component';
import { GoogleAuthService } from '../services/google-auth.service';
import { GoogleDriveAppdataService } from '../services/google-drive-appdata.service';
import { GoogleSheetsService } from '../services/google-sheets.service';
import { LmApiService } from '../services/lm-api.service';
import { AppStateService } from '../services/app-state.service';
import { initialAppData, SavedAppData } from 'src/lib/staged-exp/app';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CodemirrorConfigEditorModule } from '../codemirror-config-editor/codemirror-config-editor.module';
import { MatIconModule } from '@angular/material/icon';

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
export class AppSettingsComponent implements OnInit {
  public appNameControl: FormControl<string | null>;

  public defaultDataStr: string = JSON.stringify(initialAppData(), null, 2);
  public currentDataStr: string = this.defaultDataStr.slice();

  public downloadUrl?: string;
  public waiting: boolean = false;
  public errorMessage?: string;
  public errorCount: number = 0;

  public usersList: string[] = [];

  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;

  constructor(
    private appStateService: AppStateService,
    private driveService: GoogleDriveAppdataService,
    private authService: GoogleAuthService,
  ) {
    this.appNameControl = new FormControl<string | null>(this.appStateService.appName());
    this.appNameControl.valueChanges.forEach((n) => {
      if (n) {
        this.appStateService.setSetting('name', n);
      }
    });

    // When app data changes, update the fields in this UI.
    effect(() => {
      const newName = this.appStateService.appName();
      if (this.appNameControl.value !== null && this.appNameControl.value !== newName) {
        this.appNameControl.setValue(newName, { emitEvent: false });
      }
    });

    effect(() => {
      this.currentDataStr = JSON.stringify(this.appStateService.data(), null, 2);
    });
  }

  ngOnInit(): void {}

  reset() {
    this.appStateService.reset();
    this.appNameControl.setValue(this.appStateService.appName());
    this.currentDataStr = JSON.stringify(this.appStateService.data(), null, 2);
  }

  async saveToGoogleDrive() {
    const json = JSON.stringify(this.appStateService.data());
    const token = await this.authService.getToken(
      'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
    );

    const response = await this.driveService.saveData(
      json,
      `${this.appStateService.appName()}.json`,
      '',
      token,
    );

    console.log('saveToGoogleDrive:response', response);
  }

  download(anchorLink: HTMLAnchorElement) {
    const json = JSON.stringify(this.appStateService.data());
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

    this.appStateService.data.set(configUpdate.obj);
    this.currentDataStr = configUpdate.json;
  }

  sizeString() {
    const bytes = this.appStateService.dataSize();
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes > 1) {
      return bytes + ' bytes';
    } else if (bytes == 1) {
      return bytes + ' byte';
    } else {
      return '0 bytes';
    }
  }
}
