import "../../pair-components/button";
import "../../pair-components/icon_button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { Pages, RouterService } from "../../services/router_service";

import { Permission } from "../../shared/types";

import { styles } from "./header.scss";

/** Header component for app pages */
@customElement("page-header")
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      <div class="header">
        <div class="left">
          ${this.renderBackButton()}
          <h1>${this.renderTitle()}</h1>
        </div>
      </div>
    `;
  }

  private renderBackButton() {
    if (this.routerService.activePage !== Pages.EXPERIMENT_CREATE) {
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
    } else if (activePage === Pages.SETTINGS) {
      return "Settings";
    } else if (activePage === Pages.EXPERIMENT) {
      return "My Experiment";
    } else if (activePage === Pages.EXPERIMENT_CREATE) {
      return "New experiment";
    } else if (activePage === Pages.EXPERIMENT_STAGE) {
      return this.routerService.activeRoute.params["stage"];
    }
    return "";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-header": Header;
  }
}
