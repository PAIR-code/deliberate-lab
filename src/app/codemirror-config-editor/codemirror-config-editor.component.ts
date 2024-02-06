/* Copyright 2023 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  AfterContentInit,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import * as json5 from 'json5';
import * as codemirror from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { json as jsonlang } from '@codemirror/lang-json';
import {
  firstValueFrom,
  Observable,
  tap,
  of,
  EMPTY,
  OperatorFunction,
  combineLatest,
  BehaviorSubject,
  ReplaySubject,
  Subscription,
} from 'rxjs';

export interface ConfigUpdate<T> {
  json?: string;
  obj?: T;
  error?: string;
  close?: boolean;
}

@Component({
  selector: 'app-codemirror-config-editor',
  templateUrl: './codemirror-config-editor.component.html',
  styleUrls: ['./codemirror-config-editor.component.scss'],
})
export class CodemirrorConfigEditorComponent implements OnInit, AfterContentInit {
  @Input() whatIsBeingEditedName: string = '';
  @Input() defaultConfig: string = '';
  @Input() closable: boolean = true;
  @Output() update = new EventEmitter<ConfigUpdate<any>>();
  @Input()
  set config(value: string) {
    if (this.codeMirror) {
      this.setCodeMirrorValue(value);
    } else {
      this.lastValidConfig = value;
    }
    // } else {
    // this.tmpConfigString = value;
    // this.lastValidConfig = value;
    // }
  }

  tmpConfigString?: string;

  @ViewChild('codemirror')
  codemirrorElementRef: ElementRef | undefined;
  codemirrorOptions: {};

  codeMirror: EditorView | undefined;
  editorState?: EditorState;
  // codemirror.EditorFromTextArea | undefined;

  lastValidConfig: string = '{}';

  configError?: string;

  changed$: BehaviorSubject<boolean>;
  changed: boolean = false;

  constructor(private ngZone: NgZone) {
    this.codemirrorOptions = {
      lineNumbers: true,
      theme: 'material',
      mode: 'javascript',
      // viewportMargin: 100
    };
    this.changed$ = new BehaviorSubject(this.changed);
  }

  getCodeMirrorValue(): string {
    if (!this.codeMirror) {
      return '{}';
    }
    // this.editorState.sliceDoc
    return this.codeMirror?.state.doc.toString();
    // return this.editorState.doc.toString();
    // sliceDoc();
  }

  setCodeMirrorValue(s: string): void {
    if (!this.codeMirror) {
      this.lastValidConfig = s;
      return;
    }
    console.log('setCodeMirrorValue--> calling state update');
    const transaction = this.codeMirror.state.update({
      changes: {
        from: 0,
        to: this.codeMirror.state.doc.length,
        insert: s,
      },
    });
    this.codeMirror.dispatch(transaction);
  }

  ngOnInit() {
    const language = new Compartment();
    console.log('this.editorState.create...');
    this.editorState = EditorState.create({
      doc: this.lastValidConfig,
      extensions: [
        codemirror.basicSetup,
        language.of(jsonlang()),
        EditorView.updateListener.of((updateEvent) => {
          // Unclear if this ngZone is needed...
          this.ngZone.run(() => {
            const changedNow = this.lastValidConfig !== updateEvent.state.doc.toString();
            if (this.changed !== changedNow) {
              this.changed = changedNow;
              this.changed$.next(this.changed);
            }
          });
        }),
      ],
    });
  }

  ngAfterContentInit() {}

  ngAfterViewInit() {
    if (!this.codemirrorElementRef) {
      console.warn('ngAfterContentInit: missing codemirror element.');
      return;
    }
    this.codeMirror = new EditorView({
      state: this.editorState,
      parent: this.codemirrorElementRef.nativeElement,
    });
  }

  resetConfig() {
    if (!this.codeMirror) {
      console.warn('Missing codeMirror object.');
      return;
    }
    this.tmpConfigString = this.getCodeMirrorValue();
    this.setCodeMirrorValue(this.defaultConfig.slice());
  }

  undoChanges() {
    if (!this.codeMirror) {
      console.warn('Missing codeMirror object.');
      return;
    }
    this.tmpConfigString = this.getCodeMirrorValue();
    this.setCodeMirrorValue(this.lastValidConfig.slice());
  }

  public get isDefault() {
    if (!this.codeMirror) {
      // Note: we have to return a value consistent with what we have once we
      // setup this.codeMirror.
      return this.defaultConfig === this.lastValidConfig;
    }
    return this.defaultConfig == this.getCodeMirrorValue();
  }

  public get canReDoChanges() {
    if (!this.codeMirror) {
      console.warn('Missing codeMirror object.');
      return false;
    }
    if (!this.tmpConfigString) {
      return false;
    }
    if (this.changed) {
      return false;
    }
    return this.tmpConfigString != this.getCodeMirrorValue();
  }

  redoChanges() {
    if (!this.codeMirror) {
      console.warn('Missing codeMirror object.');
      return;
    }

    // this.tmpConfigString = this.lastValidConfig.slice();
    if (this.tmpConfigString) {
      this.setCodeMirrorValue(this.tmpConfigString);
    }
    delete this.tmpConfigString;
    // this.changed = false;
  }

  makeConfigUpdate(): ConfigUpdate<{}> {
    if (!this.codeMirror) {
      console.warn('Missing codeMirror object.');
      return {
        json: '{}',
        error: 'Missing codeMirror object.',
      };
    }

    let parsedConfig: {};
    const configString = this.getCodeMirrorValue();
    try {
      parsedConfig = json5.parse(configString);
      // This line must be after the parse; if there's an error, we don't want
      // update the last valid config.
      this.lastValidConfig = configString.slice();

      // Set for next time...
      this.changed = false;
      this.changed$.next(this.changed);

      return {
        obj: parsedConfig,
        json: configString,
      };
    } catch (e) {
      return {
        json: configString,
        error: (e as Error).message,
      };
    }
  }

  tryEmitConfig() {
    const configUpdate = this.makeConfigUpdate();
    configUpdate.close = false;
    this.configError = configUpdate.error;
    if (!this.configError) {
      delete this.tmpConfigString;
      // console.log('saved and set changed to false');
      // this.changed = false;
    }
    this.update.emit(configUpdate);
  }

  tryEmitConfigAndClose() {
    const configUpdate = this.makeConfigUpdate();
    configUpdate.close = true;
    this.configError = configUpdate.error;
    this.update.emit(configUpdate);
  }

  justClose() {
    const configUpdate = {
      close: true,
    }; // this.makeConfigUpdate();
    // this.configError = configUpdate.error;
    this.update.emit(configUpdate);
  }
}
