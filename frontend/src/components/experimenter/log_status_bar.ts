import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  getLogStatusBuckets,
  LogStatusBucket,
  StatusBarRange,
} from '@deliberation-lab/utils';

import {styles} from './log_status_bar.scss';

/** Renders a status-page style bar showing log success/error over time. */
@customElement('log-status-bar')
export class LogStatusBar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  @state() private range: StatusBarRange = '1h';

  override render() {
    const logs = this.experimentManager.logs;
    if (logs.length === 0) return nothing;

    const buckets = getLogStatusBuckets(logs, this.range);
    const totalSuccess = buckets.reduce((s, b) => s + b.successCount, 0);
    const totalError = buckets.reduce((s, b) => s + b.errorCount, 0);

    return html`
      <div class="status-bar-wrapper">
        ${this.renderHeader()}
        <div class="status-bar">
          ${buckets.map((bucket) => this.renderSegment(bucket))}
        </div>
        ${this.renderFooter(buckets, totalSuccess, totalError)}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="status-bar-header">
        <span>Log status</span>
        <div class="range-toggles">
          ${(['1h', '6h', '12h', 'all'] as StatusBarRange[]).map(
            (r) => html`
              <span
                class=${classMap({
                  'range-toggle': true,
                  active: r === this.range,
                })}
                @click=${() => {
                  this.range = r;
                }}
              >
                ${r === 'all' ? 'All' : r}
              </span>
            `,
          )}
        </div>
      </div>
    `;
  }

  private renderSegment(bucket: LogStatusBucket) {
    const total = bucket.successCount + bucket.errorCount;
    const segmentClass = this.getSegmentClass(bucket);

    const startTime = new Date(bucket.startMs);
    const endTime = new Date(bucket.endMs);
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const tooltip =
      total === 0
        ? `${fmt(startTime)}–${fmt(endTime)}: No calls`
        : `${fmt(startTime)}–${fmt(endTime)}: ${bucket.successCount} ok, ${bucket.errorCount} errors`;

    return html`
      <div
        class=${classMap({'bar-segment': true, [segmentClass]: true})}
        title=${tooltip}
      ></div>
    `;
  }

  private getSegmentClass(bucket: LogStatusBucket): string {
    const total = bucket.successCount + bucket.errorCount;
    if (total === 0) return 'empty';
    if (bucket.errorCount === 0) return 'success';
    if (bucket.successCount === 0) return 'error';
    return 'mixed';
  }

  private renderFooter(
    buckets: LogStatusBucket[],
    totalSuccess: number,
    totalError: number,
  ) {
    const firstBucket = buckets[0];
    const lastBucket = buckets[buckets.length - 1];
    const fmt = (d: Date) =>
      d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    return html`
      <div class="status-bar-footer">
        <span>${fmt(new Date(firstBucket.startMs))}</span>
        <div class="summary">
          <span class="summary-item">
            <span class="summary-dot success"></span>
            ${totalSuccess} ok
          </span>
          <span class="summary-item">
            <span class="summary-dot error"></span>
            ${totalError} errors
          </span>
        </div>
        <span>${fmt(new Date(lastBucket.endMs))}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'log-status-bar': LogStatusBar;
  }
}
