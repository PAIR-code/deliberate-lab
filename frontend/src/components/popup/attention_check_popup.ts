import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantStatus} from '@deliberation-lab/utils';

import {styles} from './popup.scss';

@customElement('attention-check-popup')
class AttentionPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly participantService = core.getService(ParticipantService);

  @state() isLoading = false;

  private handleAttentionCheckResponse = async () => {
    this.isLoading = true;
    this.analyticsService.trackButtonClick(ButtonClick.ATTENTION_ACCEPT);
    await this.participantService.resolveAttentionCheck();
    this.isLoading = false;
  };

  render() {
    return html`
      <div class="overlay">
        <div class="popup">
          <div class="title">Are you still there?</div>
          <div class="button-row">
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                ?disabled=${this.isLoading}
                @click=${this.handleAttentionCheckResponse}
              >
                Yes, continue experiment
              </pr-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'attention-check-popup': AttentionPopup;
  }
}
