import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/icon';
import '../shared/media_preview';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {
  convertUnifiedTimestampToDateTime,
  FilterState,
  filterLogs,
  getCohortOptions,
  getParticipantOptions,
  getStageOptions,
  getUnifiedDurationSeconds,
  LogEntry,
  LogEntryType,
  LogStatusFilter,
  LOG_STATUS_FILTER_LABELS,
  LOG_ERROR_CODES,
  MODEL_RESPONSE_STATUS_LABELS,
  ModelLogEntry,
  ModelResponseStatus,
} from '@deliberation-lab/utils';

import {styles} from './log_dashboard.scss';

/** Log dashboard. */
@customElement('log-dashboard')
export class Component extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @state() private fullscreen = false;
  @state() private sortMode: 'newest' | 'oldest' = 'newest';
  @state() private filterCohort: string | null = null;
  @state() private filterParticipant: string | null = null;
  @state() private filterStage: string | null = null;
  @state() private filterStatusSet: Set<LogStatusFilter> = new Set();
  @state() private showFilters = false;

  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);

  private toggleFilters(e?: Event) {
    e?.stopPropagation();
    this.showFilters = !this.showFilters;
  }

  connectedCallback() {
    super.connectedCallback();
    this._outsideClick = (evt: MouseEvent) => {
      if (!this.showFilters) return;
      if (!this.contains(evt.target as Node)) this.showFilters = false;
    };
    window.addEventListener('mousedown', this._outsideClick);
  }
  disconnectedCallback() {
    window.removeEventListener('mousedown', this._outsideClick);
    super.disconnectedCallback();
  }
  private _outsideClick!: (e: MouseEvent) => void;

  private getCohortName = (id: string) =>
    this.experimentManager.getCohort(id)?.metadata?.name ?? `Cohort ${id}`;

  private getStatusFilterLabel() {
    if (this.filterStatusSet.size === 0) return 'Any';
    if (this.filterStatusSet.size === 1) {
      const filter = Array.from(this.filterStatusSet)[0];
      return (
        LOG_STATUS_FILTER_LABELS[filter] ??
        MODEL_RESPONSE_STATUS_LABELS[filter as ModelResponseStatus] ??
        filter
      );
    }
    return `${this.filterStatusSet.size} filters`;
  }

  private renderStatusOptions() {
    const statusesInData = this.experimentManager.logStatusesInData;
    const errorCodes = LOG_ERROR_CODES.filter((code) =>
      statusesInData.has(code),
    );

    return html`
      ${this.renderStatusCheckbox(
        'success',
        LOG_STATUS_FILTER_LABELS['success'],
      )}
      ${this.renderStatusCheckbox(
        'all_errors',
        LOG_STATUS_FILTER_LABELS['all_errors'],
      )}
      ${errorCodes.length > 0
        ? html`<div class="menu-divider"></div>`
        : nothing}
      ${errorCodes.map((code) =>
        this.renderStatusCheckbox(
          code as LogStatusFilter,
          MODEL_RESPONSE_STATUS_LABELS[code],
        ),
      )}
    `;
  }

  private renderStatusCheckbox(filter: LogStatusFilter, label: string) {
    const isChecked = this.filterStatusSet.has(filter);
    return html`
      <div
        class="menu-item"
        @click=${(e: Event) => {
          e.stopPropagation();
          const next = new Set(this.filterStatusSet);
          if (next.has(filter)) {
            next.delete(filter);
          } else {
            next.add(filter);
          }
          this.filterStatusSet = next;
        }}
      >
        ${isChecked ? '☑' : '☐'} ${label}
      </div>
    `;
  }

  private getFilteredLogs() {
    const logs = this.experimentManager.logs;
    const filters: FilterState = {
      cohort: this.filterCohort,
      participant: this.filterParticipant,
      stage: this.filterStage,
      statusFilters: this.filterStatusSet,
      sortMode: this.sortMode,
    };

    return filterLogs(logs, filters, this.getCohortName);
  }

  override render() {
    const logs = this.getFilteredLogs();

    const content = html`
      ${this.renderHeader()}
      <div class="main-wrapper">
        ${repeat(
          logs,
          (log) => log.id,
          (log) => this.renderLog(log),
        )}
        ${logs.length === 0
          ? html`<div class="empty-message">No logs yet</div>`
          : nothing}
      </div>
    `;

    return this.fullscreen
      ? html` <div class="modal">${content}</div> `
      : content;
  }

  private renderLog(log: LogEntry) {
    const user = log.userProfile;
    const cohortName = this.getCohortName(log.cohortId);

    return html`
      <div class="log">
        <div class="log-header">
          <div class="chip">
            ${user?.avatar} ${user?.name} (${log.publicId})
          </div>
          <br />
          <div class="chip">
            ${cohortName} | Stage:
            ${this.experimentService.getStageName(log.stageId, true)}
          </div>
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

    return html`
      <div
        class="chip model-call ${status === ModelResponseStatus.OK
          ? 'success'
          : 'error'}"
      >
        ${log.queryTimestamp
          ? convertUnifiedTimestampToDateTime(log.queryTimestamp)
          : ''}:
        ${status.toUpperCase()}
        (${getUnifiedDurationSeconds(
          log.queryTimestamp,
          log.responseTimestamp,
        )}s)
      </div>
      <details>
        <summary>Prompt</summary>
        <pre><code>${log.prompt}</code></pre>
      </details>
      <details>
        <summary>Model response</summary>
        <pre><code>${JSON.stringify(log.response, null, 2)}</code></pre>
      </details>
      ${log.response.reasoning
        ? html`
            <details>
              <summary>Model reasoning</summary>
              <div>${log.response.reasoning}</div>
            </details>
          `
        : nothing}
      ${log.files && log.files.length > 0
        ? html`
            <details>
              <summary>Generated files (${log.files.length})</summary>
              <div class="file-gallery">
                ${log.files.map(
                  (file) => html`<media-preview .file=${file}></media-preview>`,
                )}
              </div>
            </details>
          `
        : nothing}
    `;
  }

  private renderHeader() {
    const logs = this.experimentManager.logs;

    return html`
      <div class="header">
        <div class="left">
          <div class="filter-group">
            <pr-button
              color="secondary"
              variant="default"
              @click=${(e: Event) => this.toggleFilters(e)}
            >
              <pr-icon
                size="small"
                color="secondary"
                icon="filter_list"
              ></pr-icon>
              Filter
            </pr-button>

            ${this.showFilters
              ? html`
                  <div
                    class="filter-popover"
                    @mousedown=${(e: Event) => e.stopPropagation()}
                    @click=${(e: Event) => e.stopPropagation()}
                  >
                    <!-- Cohort -->
                    <div class="filter-row">
                      <span>Cohort</span>
                      <pr-menu name=${this.filterCohort ?? 'Any'}>
                        <div class="menu-wrapper">
                          ${getCohortOptions(
                            logs,
                            this.filterParticipant,
                            this.getCohortName,
                          ).map(
                            (c) => html`
                              <div
                                class="menu-item"
                                @click=${() => (this.filterCohort = c)}
                              >
                                ${c}
                                ${this.filterCohort === c
                                  ? html`<span class="checkmark">✔</span>`
                                  : nothing}
                              </div>
                            `,
                          )}
                          <div
                            class="menu-item"
                            @click=${() => (this.filterCohort = null)}
                          >
                            Any
                            ${this.filterCohort === null
                              ? html`<span class="checkmark">✔</span>`
                              : nothing}
                          </div>
                        </div>
                      </pr-menu>
                    </div>

                    <!-- Participant -->
                    <div class="filter-row">
                      <span>Participant</span>
                      <pr-menu name=${this.filterParticipant ?? 'Any'}>
                        <div class="menu-wrapper">
                          ${getParticipantOptions(
                            logs,
                            this.filterCohort,
                            this.getCohortName,
                          ).map(
                            (p) => html`
                              <div
                                class="menu-item"
                                @click=${() => (this.filterParticipant = p)}
                              >
                                ${p}
                                ${this.filterParticipant === p
                                  ? html`<span class="checkmark">✔</span>`
                                  : nothing}
                              </div>
                            `,
                          )}
                          <div
                            class="menu-item"
                            @click=${() => (this.filterParticipant = null)}
                          >
                            Any
                            ${this.filterParticipant === null
                              ? html`<span class="checkmark">✔</span>`
                              : nothing}
                          </div>
                        </div>
                      </pr-menu>
                    </div>

                    <!-- Stage -->
                    <div class="filter-row">
                      <span>Stage</span>
                      <pr-menu name=${this.filterStage ?? 'Any'}>
                        <div class="menu-wrapper">
                          ${getStageOptions(
                            logs,
                            {
                              cohort: this.filterCohort,
                              participant: this.filterParticipant,
                            },
                            this.getCohortName,
                          ).map(
                            (s) => html`
                              <div
                                class="menu-item"
                                @click=${() => (this.filterStage = s)}
                              >
                                ${s}
                                ${this.filterStage === s
                                  ? html`<span class="checkmark">✔</span>`
                                  : nothing}
                              </div>
                            `,
                          )}
                          <div
                            class="menu-item"
                            @click=${() => (this.filterStage = null)}
                          >
                            Any
                            ${this.filterStage === null
                              ? html`<span class="checkmark">✔</span>`
                              : nothing}
                          </div>
                        </div>
                      </pr-menu>
                    </div>

                    <!-- Status -->
                    <div class="filter-row">
                      <span>Status</span>
                      <pr-menu name=${this.getStatusFilterLabel()}>
                        <div class="menu-wrapper">
                          <div
                            class="menu-item"
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this.filterStatusSet = new Set();
                            }}
                          >
                            Show all
                          </div>
                          ${this.renderStatusOptions()}
                        </div>
                      </pr-menu>
                    </div>

                    <div class="filter-actions">
                      <pr-button
                        variant="text"
                        @click=${() => {
                          this.filterCohort =
                            this.filterParticipant =
                            this.filterStage =
                              null;
                          this.filterStatusSet = new Set();
                        }}
                      >
                        Clear all
                      </pr-button>
                      <pr-button
                        variant="tonal"
                        @click=${() => (this.showFilters = false)}
                      >
                        Done
                      </pr-button>
                    </div>
                  </div>
                `
              : nothing}
          </div>

          <!-- Sort -->
          <pr-menu
            name=${this.sortMode === 'newest' ? 'Newest first' : 'Oldest first'}
            icon="sort"
            color="neutral"
          >
            <div class="menu-wrapper">
              <div class="menu-item" @click=${() => (this.sortMode = 'newest')}>
                Newest first
                ${this.sortMode === 'newest'
                  ? html`<span class="checkmark">✔</span>`
                  : nothing}
              </div>
              <div class="menu-item" @click=${() => (this.sortMode = 'oldest')}>
                Oldest first
                ${this.sortMode === 'oldest'
                  ? html`<span class="checkmark">✔</span>`
                  : nothing}
              </div>
            </div>
          </pr-menu>
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
