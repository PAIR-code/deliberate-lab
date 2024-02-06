import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyTextQuestionComponent } from './survey-text-question.component';

describe('SurveyTextQuestionComponent', () => {
  let component: SurveyTextQuestionComponent;
  let fixture: ComponentFixture<SurveyTextQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyTextQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SurveyTextQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
