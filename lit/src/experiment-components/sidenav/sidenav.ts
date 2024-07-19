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
import { FirebaseService } from "../../services/firebase_service";
import { ParticipantService } from "../../services/participant_service";
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from "../../services/router_service";

import { styles } from "./sidenav.scss";

/** Participant sidenav menu component */
@customElement("participant-sidenav")
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const routeToHome = () => {
      this.routerService.navigate(Pages.HOME);
    }

    if (!this.routerService.isParticipantPage) {
      return nothing;
    }

    return html`
      <div class="top">
        ${this.renderParticipantNav()}
      </div>
      <div class="bottom">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.isParticipantPage
        ).map((navItem) => this.renderNavItem(navItem))}
        <div class="nav-item" role="button" @click=${routeToHome}>
          <pr-icon class="icon" icon="logout"></pr-icon>
          <div>Log out</div>
        </div>
      </div>
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

    return html`
      ${this.renderParticipantItem(experiment!, participantId)}
      ${this.experimentService.stageIds.map(
        (stageId: string, index: number) => this.renderStageItem(
          experimentId!, participantId!, stageId, index
        )
      )}
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
        <div
          class=${navItemClasses}
          role="button"
          @click=${handleClick}>
          ${experiment.publicName}
        </div>
      </div>
    `;
  }

  private renderStageItem(
    experimentId: string,
    participantId: string,
    stageId: string,
    index: number,
  ) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected:
        this.routerService.activePage === Pages.PARTICIPANT_STAGE &&
        this.routerService.activeRoute.params["stage"] === stageId,
    });

    const handleClick = (_e: Event) => {
      this.routerService.navigate(Pages.PARTICIPANT_STAGE,
        {
          "experiment": experimentId,
          "participant": participantId,
          "stage": stageId
        }
      );
    };

    const lockedStage = index > this.experimentService.getStageIndex(
      this.participantService.profile?.currentStageId!
    );

    const stageName = this.experimentService.getStageName(stageId, true);

    if (lockedStage) {
      return html`
        <div class="nav-item no-hover">${stageName}</div>
      `;
    }

    return html`
      <div class=${navItemClasses} role="button" @click=${handleClick}>
        ${stageName}
        ${this.renderActiveStageChip(stageId)}
      </div>
    `;
  }

  private renderActiveStageChip(stage: string) {
    if (!this.participantService.isCurrentStage(stage)) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
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
        <pr-icon class="icon" icon=${navItem.icon}></pr-icon>
        ${navItem.title}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "participant-sidenav": SideNav;
  }
}
