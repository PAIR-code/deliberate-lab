/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';

import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from 'src/lib/participant';

import { SurveyQuestionKind, questionAsKind } from 'src/lib/types/questions.types';
import { ExpStageSurvey, StageKind } from 'src/lib/types/stages.types';
import { SurveyCheckQuestionComponent } from './survey-check-question/survey-check-question.component';
import { SurveyRatingQuestionComponent } from './survey-rating-question/survey-rating-question.component';
import { SurveyScaleQuestionComponent } from './survey-scale-question/survey-scale-question.component';
import { SurveyTextQuestionComponent } from './survey-text-question/survey-text-question.component';

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
  public stage: ExpStageSurvey;

  public questions: FormArray;

  readonly SurveyQuestionKind = SurveyQuestionKind;
  readonly questionAsKind = questionAsKind;

  constructor(
    private fb: FormBuilder,
    private participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();
    this.questions = this.fb.array([]);
    this.stage = this.participant.assertViewingStageCast(StageKind.TakeSurvey)!;

    this.stage.config.questions.forEach((_question, _index) => {
      // TODO: fill the questions array form (depending on the kinds.)
    });

    // TODO: this stage needs a mutation and all the rest in order to proceed with the rest.
  }

  /** Returns controls for each individual question component */
  get questionControls() {
    return this.questions.controls as FormGroup[];
  }
}
