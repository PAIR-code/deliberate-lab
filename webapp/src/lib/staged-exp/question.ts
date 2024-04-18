/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { Survey, QuestionData } from './data-model';
import { Participant } from './participant';

// TODO:
// Make this cleverly parameterised over the "viewingStage" ExpStage type,
// so that editStageData can make sure it never edits the wrong data kind.
export class Question<D extends QuestionData> {
  data: D;

  constructor(
    public participant: Participant,
    public survey: Signal<Survey>,
    public questionIndex: number,
  ) {
    this.data = survey().questions[this.questionIndex] as D;
  }

  edit(f: (d: QuestionData) => void | QuestionData): void {
    const questions = this.survey().questions;
    const oldQuestionData = questions[this.questionIndex];
    const maybeNewQuestionData = f(oldQuestionData);
    if (maybeNewQuestionData) {
      questions[this.questionIndex] = maybeNewQuestionData;
    }
    this.participant.editStageData<Survey>((stageData) => {
      stageData.questions = questions;
    });
  }
}
