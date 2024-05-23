import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpInfoComponent } from './exp-info.component';

describe('ExpInfoComponent', () => {
  let component: ExpInfoComponent;
  let fixture: ComponentFixture<ExpInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
