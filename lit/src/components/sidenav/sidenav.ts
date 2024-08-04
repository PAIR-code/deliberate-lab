import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {Experiment} from '@llm-mediation-experiments/utils';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth_service';
import {ExperimentService} from '../../services/experiment_service';
import {ExperimenterService} from '../../services/experimenter_service';
import {FirebaseService} from '../../services/firebase_service';
import {ParticipantService} from '../../services/participant_service';
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from '../../services/router_service';

import {styles} from './sidenav.scss';

/** Sidenav menu component */
@customElement('sidenav-menu')
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const routeToHome = () => {
      this.routerService.navigate(Pages.HOME);
    };

    const navClasses = classMap({
      'nav-wrapper': true,
      closed: !this.routerService.isExperimenterNavOpen,
    });

    const toggleNav = () => {
      this.routerService.setExperimenterNav(
        !this.routerService.isExperimenterNavOpen
      );
    };

    if (!this.authService.isExperimenter) {
      return nothing;
    }

    return html`
      <div class=${navClasses}>
        <div class="top">
          <div class="menu-icon" role="button" @click=${toggleNav}>
            <pr-icon class="icon" color="secondary" icon="menu"></pr-icon>
          </div>
          ${NAV_ITEMS.filter(
            (navItem) => navItem.isExperimenterPage && navItem.isPrimaryPage
          ).map((navItem) => this.renderNavItem(navItem))}
          <div class="experiment-nav">${this.renderExperimenterNav()}</div>
        </div>
        <div class="bottom">
          ${NAV_ITEMS.filter(
            (navItem) => navItem.isExperimenterPage && !navItem.isPrimaryPage
          ).map((navItem) => this.renderNavItem(navItem))}
        </div>
      </div>
    `;
  }

  private renderExperimenterNav() {
    if (!this.routerService.isExperimenterNavOpen) {
      return nothing;
    }

    if (this.experimentService.isLoading) {
      return html`<div class="empty-message">Loading...</div>`;
    }

    const ungroupedExperiments = this.experimenterService.getUngroupedExperiments();
    const groupedExperiments = this.experimenterService.getGroupedExperimentsMap();

    if (ungroupedExperiments.length + groupedExperiments.size === 0) {
      return html`<div class="empty-message">No experiments yet</div>`;
    }

    return html`
      ${Array.from(groupedExperiments.entries()).map(
        ([group, experiments]) => this.renderGroupExperiment(group, experiments))
      }
      ${ungroupedExperiments.map((experiment) => this.renderExperimentItem(experiment))}
    `;
  }

  private renderGroupExperiment(groupId: string, experiments: Experiment[]) {
    const groupName = experiments.length > 0 ? experiments[0].name.split('_')[0] : groupId;

    const handleClick = (_e: Event) => {
      this.routerService.navigate(
        Pages.EXPERIMENT_GROUP, { "experiment_group": groupId }
      );
    };

    return html`
      <details>
        <summary>
          <div class="nav-item" role="button" @click=${handleClick}>
            <div>${groupName}</div>
            <pr-icon icon="arrow_drop_down" color="neutral"></pr-icon>
          </div>
        </summary>
        <div class="experiment-list">
        ${experiments.map((experiment) => this.renderExperimentItem(experiment))}
        </div>
      </details>
    `;
  }

  private renderExperimentItem(experiment: Experiment, backArrow = false) {
    const navItemClasses = classMap({
      'nav-item': true,
      primary: true,
      selected: experiment.id === this.experimentService.id,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(Pages.EXPERIMENT, {
        experiment: experiment.id,
      });
    };

    return html`
      <div class="nav-item-wrapper">
        <div class=${navItemClasses} role="button" @click=${handleClick}>
          ${experiment.name}
        </div>
      </div>
    `;
  }

  private renderStageItem(
    experimentId: string,
    participantId: string,
    stageId: string,
    index: number
  ) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected:
        this.routerService.activePage === Pages.PARTICIPANT_STAGE &&
        this.routerService.activeRoute.params['stage'] === stageId,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
        experiment: experimentId,
        participant: participantId,
        stage: stageId,
      });
    };

    const lockedStage =
      index >
      this.experimentService.getStageIndex(
        this.participantService.profile?.currentStageId!
      );

    const stageName = this.experimentService.getStageName(stageId, true);

    if (lockedStage) {
      return html` <div class="nav-item no-hover">${stageName}</div> `;
    }

    return html`
      <div class=${navItemClasses} role="button" @click=${handleClick}>
        ${stageName} ${this.renderActiveStageChip(stageId)}
      </div>
    `;
  }

  private renderActiveStageChip(stage: string) {
    if (this.participantService.profile?.completedExperiment) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
    }
    if (!this.participantService.isCurrentStage(stage)) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
    }
    return html`<div class="chip">ongoing</div>`;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (_e: Event) => {
      if (navItem.isParticipantPage) {
        const routeParams = this.routerService.activeRoute.params;
        const experimentId = routeParams['experiment'];
        const participantId = routeParams['participant'];

        this.routerService.navigate(navItem.page, {
          experiment: experimentId,
          participant: participantId,
        });
      } else {
        this.routerService.navigate(navItem.page);
      }
    };

    return html`
      <div class=${navItemClasses} role="button" @click=${handleNavItemClicked}>
        <pr-icon class="icon" icon=${navItem.icon}></pr-icon>
        ${this.routerService.isExperimenterNavOpen ? navItem.title : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sidenav-menu': SideNav;
  }
}
