/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject, inject } from '@angular/core';
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

import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { updateSurveyStageMutation } from 'src/lib/api/mutations';
import { PARTICIPANT_PROVIDER_TOKEN } from 'src/lib/provider-tokens';
import { MutationType, SurveyStageUpdate } from 'src/lib/types/api.types';
import {
  SurveyQuestionKind,
  buildQuestionForm,
  questionAsKind,
} from 'src/lib/types/questions.types';
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
  public participant: Participant;
  public stage: ExpStageSurvey;

  public questions: FormArray;
  public surveyForm: FormGroup;

  readonly SurveyQuestionKind = SurveyQuestionKind;
  readonly questionAsKind = questionAsKind;

  http = inject(HttpClient);
  queryClient = injectQueryClient();

  surveyMutation: MutationType<SurveyStageUpdate, { uid: string }>;

  constructor(
    fb: FormBuilder,
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();
    this.questions = fb.array([]);
    this.stage = this.participant.assertViewingStageCast(StageKind.TakeSurvey)!;

    this.stage.config.questions.forEach((question) => {
      this.questions.push(buildQuestionForm(fb, question));
    });

    this.surveyForm = fb.group({
      questions: this.questions,
    });

    this.surveyMutation = updateSurveyStageMutation(this.http, this.queryClient, () =>
      this.participant.navigateToNextStage(),
    );
  }

  /** Returns controls for each individual question component */
  get questionControls() {
    return this.questions.controls as FormGroup[];
  }

  nextStep() {
    this.surveyMutation.mutate({
      name: this.stage.name,
      data: {
        questions: this.surveyForm.value.questions,
      },
      ...this.participant.getStageProgression(),
      uid: this.participant.userData()?.uid as string,
    });
  }
}
