import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { Permission } from "../../shared/types";

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
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">
          ${this.renderPermissionsToggle()}
        </div>
      </div>
    `;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    if (activePage === Pages.HOME) {
      return "Home";
    } else if (activePage === Pages.SETTINGS) {
      return "Settings";
    } else if (activePage === Pages.EXPERIMENT) {
      return "My Experiment";
    } else if (activePage === Pages.EXPERIMENT_STAGE) {
      return "Experiment Stage";
    }
    return "";
  }

  private renderPermissionsToggle() {
    const activePage = this.routerService.activePage;
    if (!this.authService.isExperimenter ||
      (activePage !== Pages.EXPERIMENT &&
        activePage !== Pages.EXPERIMENT_STAGE)) {
      return nothing;
    }

    const handlePreviewClick = () => {
      this.authService.editMode = false;
    }

    const handleEditClick = () => {
      this.authService.editMode = true;
    }

    if (this.authService.permission === Permission.EDIT) {
      return html`
        <pr-button size="small" variant="default" @click=${handlePreviewClick}>
          Preview
        </pr-button>
      `;
    }
    if (this.authService.permission === Permission.PREVIEW) {
      return html`
        <pr-button size="small" variant="default" @click=${handleEditClick}>
          Edit
        </pr-button>
      `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-header": Header;
  }
}
