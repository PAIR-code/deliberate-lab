import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyScaleQuestionComponent } from './survey-scale-question.component';

describe('SurveyScaleQuestionComponent', () => {
  let component: SurveyScaleQuestionComponent;
  let fixture: ComponentFixture<SurveyScaleQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyScaleQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SurveyScaleQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
