import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyCheckQuestionComponent } from './survey-check-question.component';

describe('SurveyCheckQuestionComponent', () => {
  let component: SurveyCheckQuestionComponent;
  let fixture: ComponentFixture<SurveyCheckQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyCheckQuestionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SurveyCheckQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
