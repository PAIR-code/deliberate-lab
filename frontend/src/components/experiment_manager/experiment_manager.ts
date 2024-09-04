import '../experiment_builder/experiment_builder';
import './experiment_manager_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {
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
        <div class="header">
          <div>Participant</div>
        </div>
        <div class="content">${this.renderContent()}</div>
      </div>
    `;
  }

  private renderEditor() {
    return html`
      <experiment-builder></experiment-builder>
    `;
  }

  private renderContent() {
    return html`
      ${JSON.stringify(this.experimentService.experiment)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-manager': ExperimentManagerComponent;
  }
}
