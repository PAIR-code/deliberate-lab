import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CheckQuestion } from '@llm-mediation-experiments/utils';

@Component({
  selector: 'app-survey-check-question',
  standalone: true,
  imports: [MatCheckboxModule, ReactiveFormsModule],
  templateUrl: './survey-check-question.component.html',
  styleUrl: './survey-check-question.component.scss',
})
export class SurveyCheckQuestionComponent {
  @Input() question!: CheckQuestion;
  @Input() questionForm!: FormGroup;
}
