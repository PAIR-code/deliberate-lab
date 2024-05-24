/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject, effect } from '@angular/core';
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
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';
import { Loading, buildQuestionForm } from 'src/lib/utils/angular.utils';
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
  public answers: FormArray;
  public surveyForm: FormGroup;

  readonly SurveyQuestionKind = SurveyQuestionKind;
  readonly assertCast = assertCast;

  public submitLoading = new Loading();

  constructor(
    @Inject('stage') public stage: CastViewingStage<StageKind.TakeSurvey>,
    public participantService: ParticipantService,
    fb: FormBuilder,
  ) {
    this.answers = fb.array([]);
    this.surveyForm = fb.group({
      answers: this.answers,
    });

    effect(() => {
      const { questions } = this.stage.config();
      const answers = this.stage.answers?.();

      this.answers.clear();
      questions.forEach((config) => {
        const answer = answers?.answers?.[config.id];
        // The config serves as the source of truth for the question type
        // The answer, if defined, will be used to populate the form
        this.answers.push(buildQuestionForm(fb, config, answer));
      });
    });
  }

  /** Returns controls for each individual question component */
  get questionControls() {
    return this.answers.controls as FormGroup[];
  }

  async nextStep() {
    // Run the submission inside a loading indicator
    await this.submitLoading.run(
      this.participantService
        .participant()
        ?.updateSurveyStage(this.stage.config().name, this.surveyForm.value.answers),
    );
    await this.participantService.workOnNextStage();
  }
}
