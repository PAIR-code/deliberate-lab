/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LlmApiConfigComponent } from './llm-api-config.component';

describe('LlmApiConfigComponent', () => {
  let component: LlmApiConfigComponent;
  let fixture: ComponentFixture<LlmApiConfigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LlmApiConfigComponent]
    });
    fixture = TestBed.createComponent(LlmApiConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
