import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextQuestion } from 'src/lib/staged-exp/data-model';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-survey-text-question',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './survey-text-question.component.html',
  styleUrl: './survey-text-question.component.scss',
})
export class SurveyTextQuestionComponent {
  @Input() question!: Question<TextQuestion>;

  updateAnswerText(newText: string) {
    // const newText = updateEvent as never as string;
    console.log(newText);
    this.question.edit(() => {
      this.question.data.answerText = newText;
    });
  }
}
