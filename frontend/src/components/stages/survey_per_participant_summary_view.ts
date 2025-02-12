import '../../pair-components/icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {
  CheckSurveyAnswer,
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  ParticipantProfile,
  RevealAudience,
  ScaleSurveyAnswer,
  StageKind,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyPerParticipantStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  TextSurveyAnswer,
} from '@deliberation-lab/utils';

import {styles} from './survey_reveal_view.scss';
import {SurveyAnswer} from '@deliberation-lab/utils';

/** Survey per participant summary view */
@customElement('survey-per-participant-summary-view')
export class SurveySummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() stage: SurveyPerParticipantStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html` ${this.renderTable(this.stage.questions)} `;
  }

  private makeCell(content: string) {
    return html` <div class="table-cell">${content}</div> `;
  }

  private renderTableHeader(participants: ParticipantProfile[]) {
    return html`
      <div class="table-head">
        <div class="table-row">
          <div class="table-cell number-row">#</div>
          ${participants.map(
            (p) => html`<div class="table-cell">${p.publicId}</div>`,
          )}
        </div>
      </div>
    `;
  }

  private renderTable(questions: SurveyQuestion[]) {
    let participants = this.cohortService.activeParticipants;
    if (!this.stage?.enableSelfSurvey) {
      participants = participants.filter(
        (p) => p.publicId !== this.participantService.profile?.publicId,
      );
    }

    return html`
      <div class="table">
        ${this.renderTableHeader(participants)}
        <div class="table-body">
          ${questions.map((question, index) =>
            this.renderQuestionRow(question, participants, index + 1),
          )}
        </div>
      </div>
    `;
  }

  private renderIcon(correctAnswer: string, selectedAnswer: string) {
    if (correctAnswer === '') {
      return nothing;
    }

    if (correctAnswer === selectedAnswer) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
    } else {
      return html`<pr-icon color="error" icon="cancel"></pr-icon>`;
    }
  }

  private renderQuestionRow(
    question: SurveyQuestion,
    participants: ParticipantProfile[],
    rowIndex: number,
  ) {
    if (!this.stage) {
      return '';
    }

    const renderCell = (participant: ParticipantProfile) => {
      if (!this.stage) return this.makeCell('');

      const answer =
        this.participantAnswerService.getSurveyPerParticipantAnswer(
          this.stage.id,
          question.id,
          participant.publicId,
        );
      if (!answer) {
        return this.makeCell('');
      }

      return this.renderCell(question, answer);
    };

    return html`
      <div class="table-row">
        <div class="table-cell number-row">${rowIndex}</div>
        ${participants.map((p) => renderCell(p))}
      </div>
    `;
  }

  private renderCell(
    question: SurveyQuestion | null,
    answer: SurveyAnswer | null,
  ) {
    let answerText: string | null = null;

    if (!question || !answer) {
      return this.makeCell('');
    }

    switch (answer.kind) {
      case SurveyQuestionKind.TEXT:
        answerText = (answer as TextSurveyAnswer).answer ?? '-';
        return this.makeCell(answerText!);

      case SurveyQuestionKind.CHECK:
        answerText = (answer as CheckSurveyAnswer).isChecked
          ? '✅ Checked'
          : '☑️ Unchecked';
        return this.makeCell(answerText!);

      case SurveyQuestionKind.MULTIPLE_CHOICE:
        // Assuming question.options is defined
        const selectedOption = (
          question as MultipleChoiceSurveyQuestion
        ).options.find(
          (option) =>
            option.id === (answer as MultipleChoiceSurveyAnswer).choiceId,
        );

        const selectedText = selectedOption
          ? selectedOption.text
          : 'No selection';
        const iconText = this.renderIcon(
          (question as MultipleChoiceSurveyQuestion).correctAnswerId ?? '',
          (answer as MultipleChoiceSurveyAnswer).choiceId ?? null,
        );

        return html` <div class="table-cell">${iconText} ${selectedText}</div>`;

      case SurveyQuestionKind.SCALE:
        answerText = `${(answer as ScaleSurveyAnswer).value}`;
        break;

      default:
        answerText = 'Unknown answer type';
    }

    return this.makeCell(answerText);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-per-participant-summary-view': SurveySummary;
  }
}
