/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';

import {
  QuestionData,
  StageKinds,
  Survey,
  SurveyQuestionKind,
} from '../../../../lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { Participant } from 'src/lib/staged-exp/participant';
import { SurveyCheckQuestionComponent } from './survey-check-question/survey-check-question.component';
import { SurveyRatingQuestionComponent } from './survey-rating-question/survey-rating-question.component';
import { SurveyScaleQuestionComponent } from './survey-scale-question/survey-scale-question.component';
import { SurveyTextQuestionComponent } from './survey-text-question/survey-text-question.component';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    SurveyCheckQuestionComponent,
    SurveyRatingQuestionComponent,
    SurveyScaleQuestionComponent,
    SurveyTextQuestionComponent,
  ],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss',
})
export class ExpSurveyComponent {
  public participant: Participant;
  public stageData: Signal<Survey>;
  public questions: Signal<Question<QuestionData>[]>;

  readonly SurveyQuestionKind = SurveyQuestionKind;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(StageKinds.takeSurvey);
    this.stageData = stageData;
    this.participant = participant;

    this.questions = computed(() => {
      return stageData().questions.map((v, i) => new Question(this.participant, this.stageData, i));
    });
  }

  questionAsKind<K extends SurveyQuestionKind>(
    kind: K,
    q: Question<QuestionData>,
  ): Question<QuestionData & { kind: K }> {
    return q as Question<QuestionData & { kind: K }>;
  }
}
