import '../../pair-components/button';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  LogEntry,
  LogEntryType,
  ModelLogEntry,
  ModelResponseStatus,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToISO} from '../../shared/utils';

import {styles} from './log_dashboard.scss';

/** Log dashboard. */
@customElement('log-dashboard')
export class Component extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  @state() private fullscreen = false;
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    const logs = this.experimentManager.logs;

    const content = html`
      ${this.renderHeader()}
      <div class="main-wrapper">
        ${logs.map((log) => this.renderLog(log))}
        ${logs.length === 0
          ? html`<div class="empty-message">No logs yet</div>`
          : nothing}
      </div>
    `;

    if (!this.fullscreen) {
      return content;
    }

    return html`
      <div class="modal" style="display: block;">
        <div class="modal-content">${content}</div>
      </div>
    `;
  }

  private renderLog(log: LogEntry) {
    const user = log.userProfile;
    const cohortName =
      this.experimentManager.getCohort(log.cohortId)?.metadata?.name ??
      `Cohort ${log.cohortId}`;
    return html`
      <div class="log">
        <div class="log-header">
          <div class="chip">${log.type}</div>
          <div class="chip">${cohortName}</div>
          <div class="chip">
            ${user?.avatar} ${user?.name} ${user?.pronouns} (${log.publicId})
          </div>
          <div class="chip">Stage: ${log.stageId}</div>
        </div>
        ${log.description}
        ${log.type === LogEntryType.MODEL
          ? this.renderModelLogFields(log)
          : nothing}
      </div>
    `;
  }

  private renderModelLogFields(log: ModelLogEntry) {
    const status = log.response.status;

    const renderReasoning = () => {
      if (!log.response.reasoning) return nothing;
      return html`
        <details>
          <summary>Model reasoning</summary>
          <div>${log.response.reasoning}</div>
        </details>
      `;
    };

    return html`
      <div
        class="chip ${status === ModelResponseStatus.OK ? 'success' : 'error'}"
      >
        ${status}
      </div>
      <div>
        Start timestamp:
        ${log.queryTimestamp
          ? convertUnifiedTimestampToISO(log.queryTimestamp)
          : ''}
      </div>
      <div>
        End timestamp:
        ${log.responseTimestamp
          ? convertUnifiedTimestampToISO(log.responseTimestamp)
          : ''}
      </div>
      <details>
        <summary>Prompt</summary>
        <pre><code>${log.prompt}</code></pre>
      </details>
      <details>
        <summary>Model response</summary>
        <pre><code>${JSON.stringify(log.response, null, 2)}</code></pre>
      </details>
      ${renderReasoning()}
    `;
  }

  private renderHeader() {
    const getProfileString = () => {
      const currentParticipant = this.experimentManager.currentParticipant;
      if (!currentParticipant) {
        return nothing;
      }
      return `
        ${currentParticipant.avatar ?? ''}
        ${currentParticipant?.name ?? ''}
        (${currentParticipant?.publicId})
      `;
    };

    return html`
      <div class="header">
        <div class="left">
          <div>Log dashboard</div>
        </div>
        <div class="right">
          ${this.fullscreen
            ? html`
                <pr-icon-button
                  icon="close_fullscreen"
                  color="secondary"
                  variant="default"
                  size="small"
                  @click=${() => (this.fullscreen = false)}
                ></pr-icon-button>
              `
            : html`
                <pr-icon-button
                  icon="expand_content"
                  color="secondary"
                  variant="default"
                  size="small"
                  @click=${() => (this.fullscreen = true)}
                ></pr-icon-button>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'log-dashboard': Component;
  }
}
