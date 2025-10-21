import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import '@material/web/textfield/outlined-text-field.js';
import {AlertMessage, AlertStatus} from '@deliberation-lab/utils';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {ParticipantService} from '../../services/participant.service';

import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './participant_help_panel.scss';

/** Sidenav for participant help chat. */
@customElement('help-panel')
export class HelpPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly participantService = core.getService(ParticipantService);

  @state() message = '';

  override render() {
    const close = () => {
      this.participantService.setShowHelpPanel(false);
    };

    const classes = classMap({
      nav: true,
      'full-view': !this.authService.isExperimenter,
    });

    return html`
      <div class=${classes}>
        <div class="header">
          <div>Help Panel</div>
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            @click=${() => {
              this.participantService.setShowHelpPanel(false);
            }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          <md-outlined-text-field
            placeholder="Type a message to send to the experimenter"
            variant="outlined"
            .value=${this.message}
            type="textarea"
            rows="4"
            @input=${(e: Event) => {
              this.message = (e.target as HTMLTextAreaElement).value;
            }}
          >
          </md-outlined-text-field>
          <pr-button
            color="secondary"
            ?disabled=${this.message.trim() === ''}
            @click=${() => {
              this.participantService.sendAlertMessage(this.message);
              this.message = '';
            }}
          >
            Send message
          </pr-button>
          ${this.renderAlertHistory()}
        </div>
      </div>
    `;
  }

  renderAlertHistory() {
    return html`
      <div class="alert-history">
        ${this.participantService.alerts.map((alert) =>
          this.renderAlert(alert),
        )}
      </div>
    `;
  }

  renderAlert(alert: AlertMessage) {
    return html`
      <div class="alert">
        <div class="subtitle">
          ${convertUnifiedTimestampToDate(alert.timestamp)}
        </div>
        <div class="message">${alert.message}</div>
        <div class="subtitle">Experimenter response</div>
        ${alert.responses.map((response) => html`<div>${response}</div>`)}
        ${this.renderAlertStatus(alert)}
      </div>
    `;
  }

  renderAlertStatus(alert: AlertMessage) {
    if (alert.status === AlertStatus.RESOLVED) {
      return html`<div class="status">
        Experimenter has resolved this message
      </div>`;
    } else if (alert.responses.length > 0) {
      return nothing;
    } else if (alert.status === AlertStatus.READ) {
      return html`<div class="status">
        Experimenter has read your message (no response yet)
      </div>`;
    } else {
      return html`<div class="error">Waiting for a response...</div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'help-panel': HelpPanel;
  }
}
