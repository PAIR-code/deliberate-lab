import "../../pair-components/icon";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { Experiment } from "@llm-mediation-experiments/utils";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentService } from "../../services/experiment_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { FirebaseService } from "../../services/firebase_service";
import { ParticipantService } from "../../services/participant_service";
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from "../../services/router_service";

import { styles } from "./sidenav.scss";

/** Sidenav menu component */
@customElement("sidenav-menu")
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (this.routerService.isParticipantPage) {
      return html`
        <div class="top">
          ${this.renderParticipantNav()}
        </div>
        <div class="bottom">
          ${NAV_ITEMS.filter(
            (navItem) => navItem.isParticipantPage
          ).map((navItem) => this.renderNavItem(navItem))}
        </div>
      `;
    }

    return html`
      <div class="top">
        ${this.renderExperimenterNav()}
      </div>
      <div class="bottom">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.isExperimenterPage
        ).map((navItem) => this.renderNavItem(navItem))}
      </div>
    `;
  }

  private renderExperimenterNav() {
    if (this.experimentService.isLoading) {
      return html`<div class="empty-message">Loading...</div>`;
    }

    const experiments = this.experimenterService.experiments;

    return html`
      ${experiments.length === 0 ?
        html`<div class="empty-message">No experiments yet.</div>` : nothing}
      ${experiments.map(experiment => this.renderExperimentItem(experiment))}
    `;
  }

  private renderParticipantNav() {
    if (this.experimentService.isLoading || this.participantService.isLoading) {
      return html`<div class="empty-message">Loading...</div>`;
    }

    if (this.participantService.profile === undefined) {
      return nothing;
    }

    const routeParams = this.routerService.activeRoute.params;
    const experimentId = routeParams["experiment"];
    const participantId = routeParams["participant"];
    const experiment = this.experimentService.experiment;

    const isDisabledStage = (index: number) => {
      const workingOnStageIndex = this.experimentService.stageNames.findIndex(
        (name) => this.participantService.profile?.workingOnStageName === name
      );
      return index > workingOnStageIndex;
    }

    return html`
      ${this.renderParticipantItem(experiment!, participantId)}
      ${this.experimentService.stageNames.map(
        (stage: string, index: number) => this.renderStageItem(
          experimentId!, participantId!, stage, isDisabledStage(index)
        )
      )}
    `;
  }

  private renderExperimentBackArrow(id: string) {
    const handleClick = (_e: Event) => {
      this.routerService.navigate(Pages.EXPERIMENT, { "experiment": id });
    }

    return html`
      <pr-tooltip text="Back to experiment page" position="BOTTOM_START">
        <pr-icon-button
          color="primary"
          variant="default"
          icon="arrow_back"
          @click=${handleClick}>
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderParticipantItem(experiment: Experiment, participantId: string) {
    const navItemClasses = classMap({
      "nav-item": true,
      "primary": true,
      selected: this.routerService.activePage === Pages.PARTICIPANT
        && experiment.id === this.experimentService.id,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(
        Pages.PARTICIPANT,
        { "experiment": experiment.id, "participant": participantId }
      );
    }

    return html`
      <div class="nav-item-wrapper">
        ${this.authService.isExperimenter ?
          this.renderExperimentBackArrow(experiment.id) : nothing}
        <div
          class=${navItemClasses}
          role="button"
          @click=${handleClick}>
          ${experiment.name}
        </div>
      </div>
    `;
  }

  private renderExperimentItem(experiment: Experiment, backArrow = false) {
    const navItemClasses = classMap({
      "nav-item": true,
      "primary": true,
      selected: this.routerService.activePage === Pages.EXPERIMENT
        && experiment.id === this.experimentService.id,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(
        Pages.EXPERIMENT, { "experiment": experiment.id }
      );
    }

    return html`
      <div class="nav-item-wrapper">
        <div
          class=${navItemClasses}
          role="button"
          @click=${handleClick}>
          ${experiment.name}
        </div>
      </div>
    `;
  }

  private renderStageItem(
    experimentId: string,
    participantId: string,
    stage: string,
    disabled: boolean
  ) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected:
        this.routerService.activePage === Pages.PARTICIPANT_STAGE &&
        this.routerService.activeRoute.params["stage"] === stage,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(Pages.PARTICIPANT_STAGE,
        {
          "experiment": experimentId,
          "participant": participantId,
          "stage": stage
        }
      );
    };

    if (disabled) {
      return html`
        <div class="nav-item no-hover">${stage}</div>
      `;
    }

    return html`
      <div class=${navItemClasses} role="button" @click=${handleClick}>
        ${stage}
        ${this.renderCurrentStageChip(stage)}
      </div>
    `;
  }

  private renderCurrentStageChip(stage: string) {
    if (!this.participantService.isCurrentStage(stage)) {
      return nothing;
    }
    return html`<div class="chip">ongoing</div>`;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (_e: Event) => {
      if (navItem.isParticipantPage) {
        const routeParams = this.routerService.activeRoute.params;
        const experimentId = routeParams["experiment"];
        const participantId = routeParams["participant"];

        this.routerService.navigate(navItem.page,
          {
            "experiment": experimentId,
            "participant": participantId,
          }
        );
      } else {
        this.routerService.navigate(navItem.page);
      }
    };

    return html`
      <div class=${navItemClasses} role="button" @click=${handleNavItemClicked}>
        <pr-icon icon=${navItem.icon}></pr-icon>
        ${navItem.title}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sidenav-menu": SideNav;
  }
}
