import { Component, Input } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { ScaleQuestion } from 'src/lib/staged-exp/data-model';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-survey-scale-question',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './survey-scale-question.component.html',
  styleUrl: './survey-scale-question.component.scss',
})
export class SurveyScaleQuestionComponent {
  @Input() question!: Question<ScaleQuestion>;

  setSliderValue(newValue: number) {
    this.question.edit(() => {
      this.question.data.score = newValue;
    });
  }
}
