import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/info_popup";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./header.scss";

/** Header component for app pages */
@customElement("page-header")
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      ${this.renderAuthBanner()}
      <div class="header">
        <div class="left">
          ${this.renderBackButton()}
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">
          ${this.renderActions()}
        </div>
      </div>
    `;
  }

  private renderAuthBanner() {
    if (!this.authService.isExperimenter
      || !this.routerService.isParticipantPage) {
      return nothing;
    }

    const handlePreviewOff = () => {
      this.routerService.navigate(
        Pages.EXPERIMENT,
        { "experiment": this.routerService.activeRoute.params["experiment"] }
      );
      this.routerService.setExperimenterNav(true);
    };

    const participantName = this.participantService.profile?.name;

    return html`
      <div class="banner">
        <div>
          You are previewing as
          ${participantName ? `${participantName} / ` : 'Participant '}
          ${this.participantService.profile?.publicId}.
        </div>
        <pr-button
          color="tertiary"
          padding="small"
          size="small"
          variant="default"
          @click=${handlePreviewOff}
        >
          Exit preview
        </pr-button>
      </div>
    `;
  }

  private renderBackButton() {
    if (
      this.routerService.activePage !== Pages.EXPERIMENT_CREATE &&
      this.routerService.activePage !== Pages.EXPERIMENT
    ) {
      return nothing;
    }

    const handleClick = () => {
      this.routerService.navigate(Pages.HOME);
    }

    return html`
      <pr-icon-button
        color="neutral"
        icon="arrow_back"
        variant="default"
        @click=${handleClick}>
      </pr-icon-button>
    `;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    if (activePage === Pages.HOME) {
      return "Home";
    } else if (activePage === Pages.SETTINGS
      || activePage === Pages.PARTICIPANT_SETTINGS) {
      return "Settings";
    } else if (activePage === Pages.EXPERIMENT) {
      return "My Experiment";
    } else if (activePage === Pages.EXPERIMENT_GROUP) {
      return "Experiment group: " + this.routerService.activeRoute.params["experiment_group"];  
    } else if (activePage === Pages.EXPERIMENT_CREATE) {
      return "New experiment";
    } else if (activePage === Pages.PARTICIPANT) {
      return "Welcome, participant!";
    } else if (activePage === Pages.PARTICIPANT_STAGE) {
      return this.experimentService.getStageName(
        this.routerService.activeRoute.params["stage"], true
      );
    }
    return "";
  }

  private renderActions() {
    const activePage = this.routerService.activePage;
    if (activePage === Pages.HOME) {
      return this.renderCreateExperimentButton();
    }
    if (activePage === Pages.PARTICIPANT_STAGE) {
      const stageName = this.routerService.activeRoute.params["stage"];
      const currentStage = this.experimentService.getStage(stageName);
      if (currentStage && currentStage.popupText) {
        return html`
          <info-popup .popupText=${currentStage.popupText}></info-popup>
        `;
      } else {
        return nothing;
      }
    }
    return nothing;
  }

  private renderCreateExperimentButton() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const handleClick = () => {
      this.routerService.navigate(Pages.EXPERIMENT_CREATE);
    }

    return html`
      <pr-button padding="small" variant="tonal" @click=${handleClick}>
        Create experiment
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-header": Header;
  }
}
