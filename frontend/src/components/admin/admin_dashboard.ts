import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {AdminService} from '../../services/admin.service';
import {HomeService} from '../../services/home.service';

import {
  Experiment,
  ExperimenterProfile,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './admin_dashboard.scss';

/** Admin dashboard for managing experiments */
@customElement('admin-dashboard')
export class AdminDashboard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  
  private readonly authService = core.getService(AuthService);
  private readonly adminService = core.getService(AdminService);
  private readonly homeService = core.getService(HomeService);

  @state() showExperiments = false;

  override render() {
    // TODO: If not admin, do not show dashboard
    // return nothing;

    const toggle = () => { this.showExperiments = !this.showExperiments };

    return html`
      <div class="tabs">
        <div class="tab ${this.showExperiments ? 'active' : ''}" @click=${toggle}>
          Experiments (${this.adminService.experiments.length})
        </div>
        <div class="tab ${!this.showExperiments ? 'active' : ''}" @click=${toggle}>
          Experimenters (${Object.keys(this.homeService.experimenterMap).length})
        </div>
      </div>
      ${this.showExperiments ? this.renderExperimentList() :
        this.renderExperimenterList()}
    `;
  }

  private renderExperimentList() {
    const experiments = this.adminService.experiments
    .slice() 
    .sort((a, b) => b.metadata.dateModified.seconds - a.metadata.dateModified.seconds);
 
    return html`
      ${this.renderEmptyMessage(experiments.length)}
      <div class="list">
        ${experiments.map(e => this.renderExperimentItem(e))}
      </div>
    `;
  }

  private renderExperimenterList() {
    const experimenters = Object.values(this.homeService.experimenterMap);

    return html`
      ${this.renderEmptyMessage(experimenters.length, true)}
      <div class="list">
        ${experimenters.map(e => this.renderExperimenterItem(e))}
      </div>
    `;
  }

  // TODO: Refactor into separate component
  private renderExperimentItem(experiment: Experiment) {
    return html`
      <div class="experiment-item">
        <div class="left">
          <div class="title">${experiment.metadata.name}</div>
        </div>
        <div class="right">
          <div class="subtitle">
            ${this.homeService.getExperimenterName(experiment.metadata.creator)}
          </div>
          <div class="subtitle">
            ${convertUnifiedTimestampToDate(experiment.metadata.dateModified)}
          </div>
        </div>
      </div>
    `;
  }

  // TODO: Refactor into separate component
  private renderExperimenterItem(experimenter: ExperimenterProfile) {
    return html`
      <div class="experiment-item">
        <div class="left">
          <div class="title">${experimenter.name}</div>
        </div>
        <div class="right">
          <div class="subtitle">${experimenter.email}</div>
        </div>
      </div>
    `;
  }

  private renderEmptyMessage(len: number, isExperimenters = false) {
    if (len > 0) return nothing;
    return html`
      <div class="empty-message">
        No ${isExperimenters ? 'experimenters' : 'experiments'} yet
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-dashboard': AdminDashboard;
  }
}
