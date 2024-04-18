/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpChatComponent } from './exp-chat.component';

describe('ExpChatComponent', () => {
  let component: ExpChatComponent;
  let fixture: ComponentFixture<ExpChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
