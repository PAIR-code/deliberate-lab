import { Component, Input } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextQuestion } from '@llm-mediation-experiments/utils';

@Component({
  selector: 'app-survey-text-question',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './survey-text-question.component.html',
  styleUrl: './survey-text-question.component.scss',
})
export class SurveyTextQuestionComponent {
  @Input() question!: TextQuestion;
  @Input() questionForm!: FormGroup;
}
