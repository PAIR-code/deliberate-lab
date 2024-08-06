import '../../footer/footer';
import '../../progress/progress_stage_completed';

import '@material/web/radio/radio.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  WTLSurveyStageConfig,
  WTLSurveyStageAnswer,
} from '@llm-mediation-experiments/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {core} from '../../../core/core';
import {ParticipantService} from '../../../services/participant_service';
import {convertMarkdownToHTML} from '../../../shared/utils';
import {styles} from './wtl_preview.scss';

/** WTL survey preview */
@customElement('wtl-preview')
export class WTLSurveyPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: WTLSurveyStageConfig | null = null;
  @property() answer: WTLSurveyStageAnswer | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const questionsComplete = () => {
      return this.answer !== null;
    };

    const descriptionContent = this.stage.description
      ? html`<div class="description">
          ${unsafeHTML(convertMarkdownToHTML(this.stage.description))}
        </div>`
      : nothing;

    const scale = [...Array(10).keys()].map((n) => n + 1);

    return html`
      ${descriptionContent}

      <div class="questions-wrapper">
        <div class="question">
          <div class="question-title">${this.stage.questionText}</div>
          <div class="scale labels">
            <div>${this.stage.lowerBound}</div>
            <div>${this.stage.upperBound}</div>
          </div>
          <div class="scale values">
            ${scale.map((num) => this.renderScaleRadioButton(num))}
          </div>
        </div>
      </div>
      <stage-footer .disabled=${!questionsComplete()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderScaleRadioButton(value: number) {
    const name = 'wtl';

    const handleScaleClick = (e: Event) => {
      const score = Number((e.target as HTMLInputElement).value);

      this.participantService.updateWTLSurveyStage(
        this.participantService.profile!.currentStageId,
        score
      );
    };

    return html`
      <div class="scale-button">
        <md-radio
          id=${value}
          name=${name}
          value=${value}
          aria-label=${value}
          ?checked=${this.answer?.score === value}
          ?disabled=${!this.participantService.isCurrentStage()}
          @change=${handleScaleClick}
        >
        </md-radio>
        <label for=${value}>${value}</label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wtl-preview': WTLSurveyPreview;
  }
}
