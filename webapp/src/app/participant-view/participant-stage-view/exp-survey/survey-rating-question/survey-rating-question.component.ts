import { Component, Input } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { RatingQuestion } from 'src/lib/staged-exp/data-model';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-survey-rating-question',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './survey-rating-question.component.html',
  styleUrl: './survey-rating-question.component.scss',
})
export class SurveyRatingQuestionComponent {
  @Input() question!: Question<RatingQuestion>;

  setChoice(choice: 'item1' | 'item2') {
    this.question.edit(() => {
      this.question.data.rating.choice = choice;
    });
  }

  setConfidence(confidence: number) {
    this.question.edit(() => {
      this.question.data.rating.confidence = confidence;
    });
  }
}
