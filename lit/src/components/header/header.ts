import "../../pair-components/button";
import "../../pair-components/icon_button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./header.scss";

/** Header component for app pages */
@customElement("page-header")
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
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
    } else if (activePage === Pages.EXPERIMENT_CREATE) {
      return "New experiment";
    } else if (activePage === Pages.PARTICIPANT) {
      return "Welcome, participant!";
    } else if (activePage === Pages.PARTICIPANT_STAGE) {
      return this.routerService.activeRoute.params["stage"];
    }
    return "";
  }

  private renderActions() {
    const activePage = this.routerService.activePage;
    if (activePage === Pages.HOME) {
      return this.renderCreateExperimentButton();
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
