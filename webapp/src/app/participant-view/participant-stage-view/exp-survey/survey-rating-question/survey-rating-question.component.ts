import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { ITEMS, RatingQuestionConfig } from '@llm-mediation-experiments/utils';

@Component({
  selector: 'app-survey-rating-question',
  standalone: true,
  imports: [MatSliderModule, ReactiveFormsModule, MatRadioModule],
  templateUrl: './survey-rating-question.component.html',
  styleUrl: './survey-rating-question.component.scss',
})
export class SurveyRatingQuestionComponent {
  @Input() question!: RatingQuestionConfig;
  @Input() questionForm!: FormGroup;

  readonly ITEMS = ITEMS;
}
