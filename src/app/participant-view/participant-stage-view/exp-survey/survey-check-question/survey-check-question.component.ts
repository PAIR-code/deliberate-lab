import { Component, Input } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { CheckQuestion } from 'src/lib/staged-exp/data-model';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-survey-check-question',
  standalone: true,
  imports: [MatCheckboxModule],
  templateUrl: './survey-check-question.component.html',
  styleUrl: './survey-check-question.component.scss',
})
export class SurveyCheckQuestionComponent {
  @Input() question!: Question<CheckQuestion>;

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    this.question.edit(() => {
      this.question.data.checkMark = updatedValue.checked;
    });
  }
}
