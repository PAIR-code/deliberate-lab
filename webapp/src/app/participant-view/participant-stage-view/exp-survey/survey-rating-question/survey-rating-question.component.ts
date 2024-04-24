import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { RatingQuestion } from 'src/lib/types/questions.types';

@Component({
  selector: 'app-survey-rating-question',
  standalone: true,
  imports: [MatSliderModule, ReactiveFormsModule, MatRadioModule],
  templateUrl: './survey-rating-question.component.html',
  styleUrl: './survey-rating-question.component.scss',
})
export class SurveyRatingQuestionComponent {
  @Input() question!: RatingQuestion;
  @Input() questionForm!: FormGroup;
}
