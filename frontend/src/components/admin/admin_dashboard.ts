import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {AdminService} from '../../services/admin.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  Experiment,
  ExperimenterProfileExtended,
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
  private readonly routerService = core.getService(RouterService);

  @state() showExperiments = true;

  override render() {
    // If not admin, do not show dashboard
    if (!this.authService.isAdmin) {
      return html`<div>Only admins have access to this page.</div>`;
    }

    const toggle = () => { this.showExperiments = !this.showExperiments };

    return html`
      <div class="tabs">
        <div class="tab ${this.showExperiments ? 'active' : ''}" @click=${toggle}>
          Experiments (${this.adminService.experiments.length})
        </div>
        <div class="tab ${!this.showExperiments ? 'active' : ''}" @click=${toggle}>
          Experimenters (${this.adminService.experimenters.length})
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
    const experimenters = this.adminService.experimenters;

    return html`
      ${this.renderEmptyMessage(experimenters.length, true)}
      <div class="list">
        ${experimenters.map(e => this.renderExperimenterItem(e))}
      </div>
    `;
  }

  // TODO: Refactor into separate component
  private renderExperimentItem(experiment: Experiment) {
    const onClick = () => {
      this.routerService.navigate(
        Pages.EXPERIMENT,
        { experiment: experiment.id }
      );
    };

    return html`
      <div class="experiment-item">
        <div class="left">
          <div class="title" @click=${onClick}>${experiment.metadata.name}</div>
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
  private renderExperimenterItem(experimenter: ExperimenterProfileExtended) {
    const numExperiments = this.adminService.experiments.filter(
      experiment => experiment.metadata.creator === experimenter.email
    ).length;

    const fullExperimenter = this.homeService.getExperimenter(experimenter.email);
    const lastLogin = fullExperimenter?.lastLogin ?? null;

    return html`
      <div class="experiment-item">
        <div class="left">
          <div class="left">
            ${this.homeService.getExperimenterName(experimenter.email)}
            <div class="subtitle">(${experimenter.email})</div>
          </div>
          ${experimenter.isAdmin ? html`<div class="chip">admin</div>` : nothing}
        </div>
        <div class="right">
          <div class="subtitle">${numExperiments} experiments</div>
          <div class="subtitle" style="min-width: 180px">
            ${lastLogin ? convertUnifiedTimestampToDate(lastLogin) : nothing}</div>
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
