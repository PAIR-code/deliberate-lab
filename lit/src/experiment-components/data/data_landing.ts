import '../../pair-components/button';
import '../../pair-components/icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth_service';
import {DataService} from '../../services/data_service';

import {styles} from './data_landing.scss';

/** Data analysis landing page */
@customElement('data-landing')
export class Data extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly dataService = core.getService(DataService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>403: Participants cannot access this page</div>`;
    }

    // Update data for current route
    this.dataService.updateForCurrentRoute();

    return html`
      ${this.dataService.groupId ? html`<div>Group: ${this.dataService.groupId}</div>` : nothing}
      ${this.dataService.experimentId ? html`<div>Experiment: ${this.dataService.experimentId}</div>` : nothing}
      ${this.renderDownloadZone()}
      <div class="code-container">
        <code>
          ${this.dataService.isLoading ? 'Loading...' :
          JSON.stringify(this.dataService.experimentData)}
        </code>
      </div>
    `;
  }

  private renderDownloadZone() {
    const onDownload = () => {
      this.dataService.download();
    };

    return html`
      <div class="download-zone">
        <h2>File options</h2>
        <div class="options-wrapper">
          <label class="inner-button">
            <md-checkbox
              touch-target="wrapper"
              aria-label="Download experiment JSON"
              ?checked=${this.dataService.isDownloadExperimentJSON}
              ?disabled=${this.dataService.isLoading}
              @click=${() => { this.dataService.toggleDownloadExperimentJSON() }}
            >
            </md-checkbox>
            <div class="checkbox-text"><div>Experiment JSON</div></div>
          </label>
          <label class="inner-button">
            <md-checkbox
              touch-target="wrapper"
              aria-label="Download participant CSV"
              ?checked=${this.dataService.isDownloadParticipantCSV}
              ?disabled=${this.dataService.isLoading}
              @click=${() => { this.dataService.toggleDownloadParticipantCSV() }}
            >
            </md-checkbox>
            <div class="checkbox-text">
              <div>Participant CSV</div>
              <div class="subtitle">Includes calculated payouts</div>
            </div>
          </label>
          <label class="inner-button">
            <md-checkbox
              touch-target="wrapper"
              aria-label="Download chat history CSV"
              ?checked=${this.dataService.isDownloadChatCSV}
              ?disabled=${this.dataService.isLoading}
              @click=${() => { this.dataService.toggleDownloadChatCSV() }}
            >
            </md-checkbox>
            <div class="checkbox-text">
              <div>Chat history CSV</div>
            </div>
          </label>
        </div>
        <div class="action-buttons">
          <pr-button
            color="secondary"
            variant="tonal"
            ?disabled=${this.dataService.numDownloads() === 0}
            @click=${onDownload}
          >
            <div class="inner-button">
              <pr-icon color="secondary" icon="download"></pr-icon>
              <div>Download ${this.dataService.numDownloads()} files</div>
            </div>
          </pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-landing': Data;
  }
}
