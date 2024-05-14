import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { ScaleQuestionConfig } from '@llm-mediation-experiments/utils';

@Component({
  selector: 'app-survey-scale-question',
  standalone: true,
  imports: [MatSliderModule, ReactiveFormsModule],
  templateUrl: './survey-scale-question.component.html',
  styleUrl: './survey-scale-question.component.scss',
})
export class SurveyScaleQuestionComponent {
  @Input() question!: ScaleQuestionConfig;
  @Input() questionForm!: FormGroup;
}
