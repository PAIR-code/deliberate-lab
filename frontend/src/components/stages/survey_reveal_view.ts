import '../../pair-components/icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {
  CheckSurveyAnswer,
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  RevealAudience,
  ScaleSurveyAnswer,
  StageKind,
  SurveyRevealItem,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  TextSurveyAnswer,
} from '@deliberation-lab/utils';

import {styles} from './survey_reveal_view.scss';
import {SurveyAnswer} from '@deliberation-lab/utils';

/** Survey reveal view */
@customElement('survey-reveal-view')
export class SurveyReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);

  @property() stage: SurveyStageConfig | undefined = undefined;
  @property() answer: SurveyStageParticipantAnswer | undefined = undefined;
  @property() publicData: SurveyStagePublicData | undefined = undefined;
  @property() item: SurveyRevealItem | undefined = undefined;

  override render() {
    if (!this.stage || !this.item) {
      return nothing;
    }

    const scorableQuestions: SurveyQuestion[] = this.stage.questions.filter(
      (question) => 'correctAnswerId' in question && question.correctAnswerId,
    );

    const questions: SurveyQuestion[] = this.item.revealScorableOnly
      ? scorableQuestions
      : this.stage.questions;

    const showAllParticipants =
      this.item.revealAudience === RevealAudience.ALL_PARTICIPANTS;

    const hasScorableQuestions = scorableQuestions.length > 0;
    return html`
      <h2>
        Results for <b><i>${this.stage.name}</i></b> stage
      </h2>
      ${this.renderTable(questions, showAllParticipants, hasScorableQuestions)}
      <div class="divider"></div>
    `;
  }

  private makeCell(content: string) {
    return html` <div class="table-cell">${content}</div> `;
  }

  private renderTableHeader(
    showAllParticipants: boolean,
    hasScorableQuestions: boolean,
  ) {
    const surveyAnswers = this.cohortService.stagePublicDataMap[this.stage!.id];
    if (!surveyAnswers || surveyAnswers.kind !== StageKind.SURVEY) {
      return '';
    }
    const getGroupCells = () => {
      return html` ${this.cohortService.participantMap &&
      Object.keys(this.cohortService.participantMap)
        .filter((participantId) => {
          const answers = surveyAnswers.participantAnswerMap[participantId];
          return (
            answers && Object.values(answers).some((answer) => answer !== null)
          );
        })
        .map((participantId) =>
          this.makeCell(
            getParticipantInlineDisplay(
              this.cohortService.participantMap[participantId],
            ),
          ),
        )}`;
    };

    return html`
      <div class="table-head">
        <div class="table-row">
          <div class="table-cell number-row">#</div>
          <div class="table-cell">Question</div>
          ${showAllParticipants ? getGroupCells() : this.makeCell('You chose:')}
          ${hasScorableQuestions ? this.makeCell('Correct answer') : ''}
        </div>
      </div>
    `;
  }

  private renderTable(
    questions: SurveyQuestion[],
    showAllParticipants: boolean,
    hasScorableQuestions: boolean,
  ) {
    const surveyAnswers = this.cohortService.stagePublicDataMap[this.stage!.id];
    if (!surveyAnswers || surveyAnswers.kind !== StageKind.SURVEY) {
      return '';
    }

    const filteredParticipantIds = this.cohortService.participantMap
      ? Object.keys(this.cohortService.participantMap).filter(
          (participantId) => {
            const answers = surveyAnswers?.participantAnswerMap[participantId];
            return (
              answers &&
              Object.values(answers).some((answer) => answer !== null)
            );
          },
        )
      : [];

    const allParticipantIds = Object.keys(
      this.cohortService.participantMap || {},
    );
    const hasFilteredParticipants =
      allParticipantIds.length > filteredParticipantIds.length;

    return html`
      <div class="table">
        ${this.renderTableHeader(showAllParticipants, hasScorableQuestions)}
        <div class="table-body">
          ${questions.map((question, index) =>
            this.renderQuestionRow(
              question,
              showAllParticipants,
              hasScorableQuestions,
              index + 1,
            ),
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
    showAllParticipants: boolean,
    hasScorableQuestions: boolean,
    rowIndex: number,
  ) {
    if (!this.stage || !this.cohortService.stagePublicDataMap) {
      return '';
    }
    const surveyAnswers = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!surveyAnswers || surveyAnswers.kind !== StageKind.SURVEY) {
      return '';
    }

    const renderMultipleAnswerCells = () => {
      return html`
        ${Object.keys(this.cohortService.participantMap)
          .filter((participantId) => {
            const answers = surveyAnswers.participantAnswerMap[participantId];
            return (
              answers &&
              Object.values(answers).some((answer) => answer !== null)
            );
          })
          .map((participantId) => {
            const participantAnswerMap =
              surveyAnswers.participantAnswerMap[participantId];
            if (!participantAnswerMap || !participantAnswerMap[question.id]) {
              return this.makeCell('');
            }

            const answer = participantAnswerMap[question.id] as SurveyAnswer;
            return this.renderCell(question, answer);
          })}
      `;
    };

    const renderIndividualAnswerCells = () => {
      if (
        !this.answer ||
        !this.answer.answerMap ||
        !this.answer.answerMap[question?.id]
      ) {
        return this.makeCell('');
      }
      return this.renderCell(question, this.answer.answerMap[question.id]);
    };

    const renderCorrectAnswerCell = () => {
      if (
        hasScorableQuestions &&
        'correctAnswerId' in question &&
        question.correctAnswerId
      ) {
        const correctAnswer = question.options.find(
          (option) => option.id === question.correctAnswerId,
        );
        return this.makeCell(correctAnswer?.text ?? '');
      } else {
        return nothing;
      }
    };

    let tooltipText = question.questionTitle;
    if ('options' in question) {
      // TODO: Render HTML.
      tooltipText +=
        '. Options: ' +
        (question as MultipleChoiceSurveyQuestion).options
          .map((item) => item.text)
          .join(', ');
    }

    return html`
      <div class="table-row">
        <div class="table-cell number-row">${rowIndex}</div>
        <div class="table-cell">
          ${question.questionTitle.length > 50
            ? html`
                <pr-tooltip text="${tooltipText}" position="BOTTOM_END">
                  <span style="cursor: pointer">
                    ${question.questionTitle.slice(0, 50)}...
                  </span>
                </pr-tooltip>
              `
            : question.questionTitle}
        </div>
        ${showAllParticipants
          ? renderMultipleAnswerCells()
          : renderIndividualAnswerCells()}
        ${renderCorrectAnswerCell()}
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
    'survey-reveal-view': SurveyReveal;
  }
}
