import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { ScaleQuestion } from 'src/lib/types/questions.types';

@Component({
  selector: 'app-survey-scale-question',
  standalone: true,
  imports: [MatSliderModule, ReactiveFormsModule],
  templateUrl: './survey-scale-question.component.html',
  styleUrl: './survey-scale-question.component.scss',
})
export class SurveyScaleQuestionComponent {
  @Input() question!: ScaleQuestion;
  @Input() questionForm!: FormGroup;
}
