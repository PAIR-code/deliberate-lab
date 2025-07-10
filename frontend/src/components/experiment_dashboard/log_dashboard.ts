import '../../pair-components/button';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

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

  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    const logs = this.experimentManager.logs;

    return html`
      ${this.renderParticipantHeader()}
      <div class="main-wrapper">
        ${logs.map((log) => this.renderLog(log))}
        ${logs.length === 0
          ? html`<div class="empty-message">No logs yet</div>`
          : nothing}
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
        ${
          log.queryTimestamp
            ? convertUnifiedTimestampToISO(log.queryTimestamp)
            : ''
        }
      </div>
      <div>
        End timestamp:
        ${
          log.responseTimestamp
            ? convertUnifiedTimestampToISO(log.responseTimestamp)
            : ''
        }
      </div>
      <details>
        <summary>Prompt</summary>
        <pre><code>${log.prompt}</code></pre>
      </details>
      <details>
        <summary>Generation config</summary>
        <pre><code>${JSON.stringify(log.response.generationConfig, null, 2)}</pre></code>
      </details>
      <details>
        <summary>Model response</summary>
        <pre><code>${JSON.stringify(log.response, null, 2)}</code></pre>
      </details>
      ${renderReasoning()}
    `;
  }

  private renderParticipantHeader() {
    if (!this.experimentManager.currentParticipant) {
      return nothing;
    }

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
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            size="small"
            @click=${() => {
              this.experimentManager.setShowLogs(false);
            }}
          >
          </pr-icon-button>
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
