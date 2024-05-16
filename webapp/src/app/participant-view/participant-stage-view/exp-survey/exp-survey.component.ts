/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input, signal } from '@angular/core';
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

import { MatButtonModule } from '@angular/material/button';
import { StageKind, SurveyQuestionKind, assertCast } from '@llm-mediation-experiments/utils';
import { CastViewingStage } from 'src/app/services/participant.service';
import { buildQuestionForm, subscribeSignals } from 'src/lib/utils/angular.utils';
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
    MatButtonModule,
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
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true })
  set stage(value: CastViewingStage<StageKind.TakeSurvey>) {
    this._stage = value;

    // Regenerate the questions everytime the stage config or answers change
    subscribeSignals(
      [this.stage.config, this.stage.answers ?? signal(undefined)],
      ({ questions }, answers) => {
        this.questions.clear();
        questions.forEach((config) => {
          const answer = answers?.answers[config.id];
          // The config serves as the source of truth for the question type
          // The answer, if defined, will be used to populate the form
          this.questions.push(buildQuestionForm(this.fb, config, answer));
        });
      },
    );
  }

  get stage() {
    return this._stage as CastViewingStage<StageKind.TakeSurvey>;
  }

  private _stage?: CastViewingStage<StageKind.TakeSurvey>;

  public questions: FormArray;
  public surveyForm: FormGroup;

  readonly SurveyQuestionKind = SurveyQuestionKind;
  readonly assertCast = assertCast;

  constructor(private fb: FormBuilder) {
    this.questions = fb.array([]);
    this.surveyForm = fb.group({
      questions: this.questions,
    });
  }

  /** Returns controls for each individual question component */
  get questionControls() {
    return this.questions.controls as FormGroup[];
  }

  nextStep() {
    // TODO: use new backend
  }
}
