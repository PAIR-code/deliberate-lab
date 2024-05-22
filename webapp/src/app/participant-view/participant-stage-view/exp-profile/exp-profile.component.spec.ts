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
