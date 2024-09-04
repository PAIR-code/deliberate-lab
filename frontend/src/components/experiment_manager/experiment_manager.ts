import '../experiment_builder/experiment_builder';

import './cohort_settings_dialog';
import './experiment_manager_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {
  CohortConfig,
  StageKind
} from '@deliberation-lab/utils';

import {styles} from './experiment_manager.scss';

/** Experiment manager used to view/update cohorts, participants */
@customElement('experiment-manager')
export class ExperimentManagerComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);

  connectedCallback() {
    super.connectedCallback();
    this.experimentService.updateForCurrentRoute();
    this.experimentManager.updateForCurrentRoute();
  }

  override render() {
    if (this.experimentManager.isEditing) {
      return this.renderEditor();
    }

    if (this.experimentService.isLoading || this.experimentManager.isLoading) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <experiment-manager-nav></experiment-manager-nav>
      <div class="experiment-manager">
        ${this.renderManager()}
      </div>
      ${this.renderCohortSettingsDialog()}
    `;
  }

  private renderCohortSettingsDialog() {
    if (!this.experimentManager.cohortEditing) {
      return nothing;
    }

    return html`
      <cohort-settings-dialog></cohort-settings-dialog>
    `;
  }

  private renderEditor() {
    return html`
      <experiment-builder></experiment-builder>
    `;
  }

  private renderManager() {
    if (!this.experimentManager.currentParticipantId) {
      return html`
        <div class="empty-message">
          Use the left panel to manage and select participants.
        </div>
      `;
    }

    return html`
      <div class="header">
        ${this.renderHeader()}
      </div>
      <div class="content">${this.renderContent()}</div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="left">
        ${this.experimentManager.currentParticipant?.publicId ?? ''}
      </div>
      <pr-menu name="Transfer">
        <div class="menu-wrapper">
          ${this.experimentManager.availableCohorts.map(
            cohort => this.renderTransferOption(cohort)
          )}
        </div>
      </pr-menu>
    `;
  }

  private renderTransferOption(cohort: CohortConfig) {
    return html`
      <div class="menu-item" role="button">
        ${this.experimentManager.getCohortName(cohort)}
      </div>
    `;
  }

  private renderContent() {
    return html`
      ${JSON.stringify(this.experimentManager.currentParticipant)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-manager': ExperimentManagerComponent;
  }
}
