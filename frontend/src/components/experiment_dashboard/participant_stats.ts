import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ParticipantProfileExtended,
  ParticipantProfile,
  ParticipantStatus,
  StageKind,
  UnifiedTimestamp,
  calculatePayoutTotal,
  LogEntry,
  LogEntryType,
  ModelLogEntry,
  ModelResponseStatus,
  getUnifiedDurationSeconds,
  convertUnifiedTimestampToDateTime,
} from '@deliberation-lab/utils';
import {getCohortName} from '../../shared/cohort.utils';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';
import '../stages/payout_summary_view';
import '../stages/reveal_summary_view';
import '../stages/ranking_summary_view';
import '../stages/survey_summary_view';
import '../stages/survey_per_participant_summary_view';

import {styles} from './participant_stats.scss';

import {isUnlockedStage} from '../../shared/participant.utils';

/** Participant profile status/stats (for experiment manager) */
@customElement('participant-stats')
export class Preview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  public readonly experimentManager = core.getService(ExperimentManager);
  public readonly experimentService = core.getService(ExperimentService);

  public readonly participantService = core.getService(ParticipantService);
  public readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() profile: ParticipantProfileExtended | undefined = undefined;

  private getStageName = (id: string) => {
    return this.experimentService.getStageName(id, true);
  };

  override render() {
    if (!this.profile) {
      return nothing;
    }

    return html`
      ${this.renderChips()} ${this.renderTable()} ${this.renderStats()}
      <div class="divider"></div>
      ${this.renderAgentLog()} ${this.renderStageDatas()}
    `;
  }

  private renderStats() {
    if (!this.profile) return nothing;

    const transfer = this.profile.transferCohortId;
    const timestamps = this.profile.timestamps;

    const getCohort = (id: string) => {
      const cohort = this.experimentManager.getCohort(id);
      return cohort ? getCohortName(cohort) : '';
    };

    return html`
      <div class="stats-wrapper">
        ${transfer
          ? html`<div>Pending transfer: ${getCohort(transfer)}</div>`
          : nothing}
        ${this.renderTimestamp(
          'Started experiment',
          timestamps.startExperiment,
        )}
        ${this.renderTimestamp('Ended experiment', timestamps.endExperiment)}
      </div>
    `;
  }

  private renderChips() {
    return html`
      <div class="chip-container">
        ${this.renderStatusChip()} ${this.renderConnectedChip()}
        ${this.renderStageChip()} ${this.renderTOSChip()}
      </div>
    `;
  }

  private renderTable() {
    if (!this.profile) {
      return nothing;
    }

    const isProlific =
      this.experimentService.experiment?.prolificConfig
        ?.enableProlificIntegration;

    return html`
      <div class="table-wrapper">
        <div class="table">
          <div class="table-row">
            <div class="table-cell small">Profile</div>
            <div class="table-cell">
              ${getParticipantInlineDisplay(this.profile)}
              ${this.profile.pronouns ? `(${this.profile.pronouns})` : ''}
            </div>
          </div>
          <div class="table-row">
            <div class="table-cell small">Public ID</div>
            <div class="table-cell">${this.profile.publicId}</div>
          </div>
          <div class="table-row">
            <div class="table-cell small">Private ID</div>
            <div class="table-cell">${this.profile.privateId}</div>
          </div>
          ${this.renderAnonymousProfileTableCells()}
          <div class="table-row">
            <div class="table-cell small">Prolific ID</div>
            <div class="table-cell">
              ${isProlific ? `${this.profile?.prolificId}` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getStatusChipStyle(status: ParticipantStatus): {
    emoji: string;
    className: string;
  } {
    switch (status) {
      case ParticipantStatus.ATTENTION_CHECK:
        return {emoji: '⚠️', className: 'progress'};
      case ParticipantStatus.IN_PROGRESS:
        return {emoji: '⏳', className: 'primary'};
      case ParticipantStatus.SUCCESS:
        return {emoji: '✅', className: 'success'};
      case ParticipantStatus.TRANSFER_PENDING:
        return {emoji: '📤', className: 'progress'};
      case ParticipantStatus.TRANSFER_TIMEOUT:
        return {emoji: '⏰', className: 'error'};
      case ParticipantStatus.TRANSFER_FAILED:
        return {emoji: '❌', className: 'error'};
      case ParticipantStatus.TRANSFER_DECLINED:
        return {emoji: '🚫', className: 'error'};
      case ParticipantStatus.ATTENTION_TIMEOUT:
        return {emoji: '⏰', className: 'error'};
      case ParticipantStatus.BOOTED_OUT:
        return {emoji: '🚷', className: 'error'};
      case ParticipantStatus.DELETED:
        return {emoji: '🗑️', className: 'error'};
      default:
        return {emoji: '❓', className: 'secondary'};
    }
  }

  private getConnectedChipStyle(connected: boolean): {
    emoji: string;
    className: string;
  } {
    if (connected) {
      return {emoji: '🔗', className: 'success'};
    } else {
      return {emoji: '📵', className: 'error'};
    }
  }

  private renderTOSChip() {
    if (!this.profile) {
      return nothing;
    }
    const accepted = this.profile.timestamps.acceptedTOS;
    if (accepted) {
      return html`
        <div class="chip success">
          <b>✅ Accepted TOS:</b> ${convertUnifiedTimestampToDate(accepted)}
        </div>
      `;
    }
    return html` <div class="chip progress"><b>⚠️ Accepted TOS:</b> N/A</div> `;
  }

  private renderStatusChip() {
    if (!this.profile) {
      return nothing;
    }
    const {currentStatus} = this.profile;
    const {emoji, className} = this.getStatusChipStyle(currentStatus);

    return html`
      <div class="chip ${className}">
        <b>${emoji} Status:</b> ${currentStatus}
      </div>
    `;
  }

  private renderConnectedChip() {
    if (!this.profile || this.profile.connected === null) {
      return nothing;
    }
    const {connected} = this.profile;
    const {emoji, className} = this.getConnectedChipStyle(connected);

    return html`
      <div class="chip ${className}">
        <b>${emoji} Connected:</b> ${connected}
      </div>
    `;
  }

  private renderStageChip() {
    if (!this.profile) {
      return nothing;
    }
    const {currentStatus} = this.profile;

    return html`
      <div class="chip neutral">
        <b>Current stage:</b> ${this.getStageName(this.profile.currentStageId)}
      </div>
    `;
  }

  private renderAnonymousProfileTableCells() {
    if (!this.profile || !this.profile.anonymousProfiles) return nothing;

    const renderProfile = (key: string) => {
      if (!this.profile || !this.profile.anonymousProfiles) return nothing;
      const p = this.profile?.anonymousProfiles[key];

      return html`
        <div class="table-row">
          <div class="table-cell small">${key}</div>
          <div class="table-cell">
            ${p?.avatar} ${p?.name} ${(p?.repeat ?? 0) + 1}
          </div>
        </div>
      `;
    };

    return html`
      ${Object.keys(this.profile.anonymousProfiles).map((profile) =>
        renderProfile(profile),
      )}
    `;
  }

  private renderStageDatas() {
    if (!this.profile) return;

    const renderStageData = (stageId: string) => {
      const stage = this.experimentService.getStage(stageId);
      if (
        !stage ||
        !isUnlockedStage(this.profile as ParticipantProfile, stageId)
      ) {
        return nothing;
      }

      let stageHtml;
      const answer = this.participantService.getStageAnswer(stage.id);
      switch (stage.kind) {
        case StageKind.PAYOUT:
          stageHtml = html`
            <payout-summary-view
              .stage=${stage}
              .answer=${answer}
            ></payout-summary-view>
          `;
          break;
        case StageKind.REVEAL:
          stageHtml = html`
            <reveal-summary-view .stage=${stage}></reveal-summary-view>
          `;
          break;
        case StageKind.RANKING:
          stageHtml = html`
            <ranking-summary-view .stage=${stage}></ranking-summary-view>
          `;
          break;
        case StageKind.SURVEY:
          stageHtml = html`
            <survey-summary-view .stage=${stage}></survey-summary-view>
          `;
          break;
        case StageKind.SURVEY_PER_PARTICIPANT:
          stageHtml = html`
            <survey-per-participant-summary-view .stage=${stage}>
            </survey-per-participant-summary-view>
          `;
          break;
        default:
          return nothing;
      }

      if (stageHtml) {
        return html`
          <div>
            <h4>${this.getStageName(stageId)}</h4>
            ${stageHtml}
          </div>
          <div class="divider"></div>
        `;
      }
    };

    const stages = this.experimentService.experiment?.stageIds ?? [];
    if (stages.length === 0) return nothing;
    return html`
      <h3>Stage responses</h3>
      ${stages.map((stageId) => renderStageData(stageId))}
    `;
  }

  private renderTimestamp(label: string, value: UnifiedTimestamp | null) {
    if (value === null) {
      return;
    }
    return html`
      <div><b>${label}:</b> ${convertUnifiedTimestampToDate(value)}</div>
    `;
  }

  /** Get logs filtered to this participant */
  private getParticipantLogs(): ModelLogEntry[] {
    if (!this.profile) return [];
    const privateId = this.profile.privateId;
    return this.experimentManager.logs
      .filter(
        (log): log is ModelLogEntry =>
          log.type === LogEntryType.MODEL && log.privateId === privateId,
      )
      .sort((a, b) => {
        // Sort by query timestamp descending (newest first)
        const aTime = Number(a.queryTimestamp ?? 0);
        const bTime = Number(b.queryTimestamp ?? 0);
        return bTime - aTime;
      });
  }

  /** Render the Agent log section */
  private renderAgentLog() {
    if (!this.profile?.agentConfig) {
      return nothing;
    }

    const agentConfig = this.profile.agentConfig;
    const logs = this.getParticipantLogs();

    return html`
      <h3>Agent log</h3>
      <div class="agent-log-wrapper">
        ${this.renderAgentConfig(agentConfig)}
        <div class="agent-log-summary">
          <span class="chip neutral">
            <b>Total API calls:</b> ${logs.length}
          </span>
          <span class="chip success">
            <b>Successful:</b>
            ${logs.filter((l) => l.response.status === ModelResponseStatus.OK)
              .length}
          </span>
          <span class="chip error">
            <b>Failed:</b>
            ${logs.filter((l) => l.response.status !== ModelResponseStatus.OK)
              .length}
          </span>
        </div>
        ${logs.length === 0
          ? html`<div class="empty-message">No API calls yet</div>`
          : logs.map((log) => this.renderLogEntry(log))}
      </div>
      <div class="divider"></div>
    `;
  }

  /** Render agent configuration info */
  private renderAgentConfig(
    agentConfig: NonNullable<ParticipantProfileExtended['agentConfig']>,
  ) {
    return html`
      <div class="agent-config">
        <div class="table">
          <div class="table-row">
            <div class="table-cell small">API Type</div>
            <div class="table-cell">${agentConfig.modelSettings.apiType}</div>
          </div>
          <div class="table-row">
            <div class="table-cell small">Model</div>
            <div class="table-cell">${agentConfig.modelSettings.modelName}</div>
          </div>
          ${agentConfig.promptContext
            ? html`
                <div class="table-row">
                  <div class="table-cell small">Prompt context</div>
                  <div class="table-cell">${agentConfig.promptContext}</div>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  /** Render a single log entry */
  private renderLogEntry(log: ModelLogEntry) {
    const status = log.response.status;
    const isSuccess = status === ModelResponseStatus.OK;

    return html`
      <div class="log-entry">
        <div class="log-entry-header">
          <span class="chip ${isSuccess ? 'success' : 'error'}">
            ${status.toUpperCase()}
          </span>
          <span class="log-timestamp">
            ${log.queryTimestamp
              ? convertUnifiedTimestampToDateTime(log.queryTimestamp)
              : 'N/A'}
          </span>
          <span class="log-duration">
            (${getUnifiedDurationSeconds(
              log.queryTimestamp,
              log.responseTimestamp,
            )}s)
          </span>
          <span class="chip neutral"> ${this.getStageName(log.stageId)} </span>
        </div>
        ${log.description
          ? html`<div class="log-description">${log.description}</div>`
          : nothing}
        <details>
          <summary>Prompt</summary>
          <pre><code>${log.prompt}</code></pre>
        </details>
        <details>
          <summary>Response</summary>
          <pre><code>${JSON.stringify(log.response, null, 2)}</code></pre>
        </details>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-stats': Preview;
  }
}
