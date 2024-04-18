import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediatorFeedbackComponent } from './mediator-feedback.component';

describe('MediatorFeedbackComponent', () => {
  let component: MediatorFeedbackComponent;
  let fixture: ComponentFixture<MediatorFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediatorFeedbackComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MediatorFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
