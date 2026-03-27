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
        ${this.renderHeader(totalSuccess, totalError)}
        <div class="status-bar">
          ${buckets.map((bucket) => this.renderSegment(bucket))}
        </div>
        ${this.renderFooter(buckets)}
      </div>
    `;
  }

  private renderHeader(totalSuccess: number, totalError: number) {
    return html`
      <div class="status-bar-header">
        <span>Log status</span>
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
      d.toLocaleDateString([], {month: 'short', day: 'numeric'}) +
      ' ' +
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

  /** Interval in ms between markers for each range. */
  private static readonly MARKER_INTERVALS: Record<string, number> = {
    '1h': 30 * 60 * 1000, // 30 min
    '6h': 2 * 60 * 60 * 1000, // 2 hours
    '12h': 3 * 60 * 60 * 1000, // 3 hours
  };

  private getTimeMarkers(
    buckets: LogStatusBucket[],
  ): {label: string; pct: number}[] {
    if (buckets.length === 0) return [];

    const startMs = buckets[0].startMs;
    const endMs = buckets[buckets.length - 1].endMs;
    const totalMs = endMs - startMs;
    if (totalMs <= 0) return [];

    const markers: {label: string; pct: number}[] = [];

    if (this.range === 'all') {
      // Date boundary markers
      const totalBuckets = buckets.length;
      let prevDateStr = '';
      for (let i = 0; i < totalBuckets; i++) {
        const d = new Date(buckets[i].startMs);
        const dateStr = d.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        if (dateStr !== prevDateStr) {
          if (prevDateStr !== '') {
            const pct = (i / totalBuckets) * 100;
            if (pct >= 28 && pct <= 72) {
              markers.push({label: dateStr, pct});
            }
          }
          prevDateStr = dateStr;
        }
      }
    } else {
      // Round time markers at fixed intervals, aligned to local wall-clock
      const intervalMs = LogStatusBar.MARKER_INTERVALS[this.range];
      // Align to local midnight so markers land on clean times (e.g. 9 AM, 12 PM)
      const localMidnight = new Date(startMs);
      localMidnight.setHours(0, 0, 0, 0);
      const midnightMs = localMidnight.getTime();
      const firstMarker =
        midnightMs +
        Math.ceil((startMs - midnightMs) / intervalMs) * intervalMs;

      for (let ms = firstMarker; ms < endMs; ms += intervalMs) {
        const pct = ((ms - startMs) / totalMs) * 100;
        // Skip markers too close to edges
        if (pct < 18 || pct > 78) continue;
        const d = new Date(ms);
        // Use short format: "10 AM" for on-the-hour, "10:30 AM" for others
        const label =
          d.getMinutes() === 0
            ? d.toLocaleTimeString([], {hour: 'numeric'})
            : d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
        markers.push({label, pct});
      }
    }

    return markers;
  }

  private renderFooter(buckets: LogStatusBucket[]) {
    const firstBucket = buckets[0];
    const lastBucket = buckets[buckets.length - 1];
    const fmt = (d: Date) =>
      d.toLocaleDateString([], {month: 'short', day: 'numeric'}) +
      ' ' +
      d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    const markers = this.getTimeMarkers(buckets);

    return html`
      <div class="status-bar-footer">
        <span class="footer-label start"
          >${fmt(new Date(firstBucket.startMs))}</span
        >
        ${markers.map(
          (m) => html`
            <span class="footer-label" style="left: ${m.pct}%">
              ${m.label}
            </span>
          `,
        )}
        <span class="footer-label end">${fmt(new Date(lastBucket.endMs))}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'log-status-bar': LogStatusBar;
  }
}
