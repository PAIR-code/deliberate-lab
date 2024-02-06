/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpProfileComponent } from './exp-profile.component';

describe('ExpProfileComponent', () => {
  let component: ExpProfileComponent;
  let fixture: ComponentFixture<ExpProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpProfileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
