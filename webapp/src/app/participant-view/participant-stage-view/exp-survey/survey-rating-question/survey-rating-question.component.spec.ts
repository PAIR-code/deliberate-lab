import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyRatingQuestionComponent } from './survey-rating-question.component';

describe('SurveyRatingQuestionComponent', () => {
  let component: SurveyRatingQuestionComponent;
  let fixture: ComponentFixture<SurveyRatingQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyRatingQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SurveyRatingQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
