import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/info_popup";
import "../../pair-components/menu";
import "../../pair-components/tooltip";

import "../../experiment-components/experiment/experiment_config_menu";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentService } from "../../services/experiment_service";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { ExperimentTemplate } from "@llm-mediation-experiments/utils";

import { styles } from "./header.scss";

/** Header component for app pages */
@customElement("page-header")
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly experimenterService = core.getService(ExperimenterService);
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

  private renderEditPermissions() {
    const toggleEdit = () => {
      this.authService.setEditPermissions(!this.authService.canEdit);
    };

    return html`
      <pr-tooltip text="Toggle edit permissions" position="BOTTOM_END">
        <pr-icon-button
          icon=${this.authService.canEdit ? 'edit_off' : 'edit'}
          color="primary"
          variant="default"
          @click=${toggleEdit}>
        </pr-icon-button>
      </pr-tooltip>
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
      this.authService.setEditPermissions(false);
      this.routerService.setExperimenterNav(true);
    };

    const participantName = this.participantService.profile?.name;

    return html`
      <div class="banner">
        <div class="left">
          <pr-tooltip text="Exit preview" position="BOTTOM_START">
            <pr-icon-button
              icon="arrow_back"
              color="tertiary"
              padding="small"
              size="small"
              variant="default"
              @click=${handlePreviewOff}
            >
            </pr-icon-button>
          </pr-tooltip>
          <div>
            You are previewing as
            ${participantName ? `${participantName} / ` : 'Participant '}
            ${this.participantService.profile?.publicId}.
          </div>
        </div>
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
      this.authService.setEditPermissions(false);
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

    switch (activePage) {
      case Pages.HOME:
        return "Home";
      case Pages.SETTINGS:
        return "Settings";
      case Pages.PARTICIPANT_SETTINGS:
        return "Settings";
      case Pages.EXPERIMENT:
        return this.experimentService.experiment?.name ?? "Experiment";
      case Pages.EXPERIMENT_GROUP:
        return "Experiment group: " + this.routerService.activeRoute.params["experiment_group"];
      case Pages.EXPERIMENT_CREATE:
        return "New experiment";
      case Pages.PARTICIPANT:
        return "Welcome, participant!";
      case Pages.PARTICIPANT_STAGE:
        return this.experimentService.getStageName(
          this.routerService.activeRoute.params["stage"], true
        );
      default:
        return "";
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.HOME:
        return html`
          ${this.renderCreateExperimentButton()}
          ${this.renderEditPermissions()}
        `;
      case Pages.EXPERIMENT_GROUP:
        return this.renderEditPermissions();
      case Pages.EXPERIMENT:
        return this.renderEditPermissions();
      case Pages.PARTICIPANT_STAGE:
        const stageName = this.routerService.activeRoute.params["stage"];
        const currentStage = this.experimentService.getStage(stageName);
        if (currentStage && currentStage.popupText) {
          return html`
            <info-popup .popupText=${currentStage.popupText}></info-popup>
          `;
        }
        return nothing;
      case Pages.EXPERIMENT_CREATE:
        return this.renderExperimentConfigButtons();
      default:
        return nothing;
    }
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

  private renderExperimentConfigTemplateItem(template: ExperimentTemplate) {
    const onClick = () => {
      this.experimentConfig.loadTemplate(template.id, template.name);
    };

    return html`
      <div class="template-item" role="button" @click=${onClick}>
        <div>${template.name}</div>
        <div class="subtitle">${template.id}</div>
      </div>
    `;
  }

  private renderExperimentConfigButtons() {
    return html`
      <pr-menu color="secondary" name="Load template">
        <div class="menu-wrapper">
          ${this.experimenterService.templates.length === 0 ?
            html`<div>No templates yet</div>` : nothing}
          ${this.experimenterService.templates.map(
            template => this.renderExperimentConfigTemplateItem(template))}
        </div>
      </pr-menu>
      <experiment-config-menu></experiment-config-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-header": Header;
  }
}
