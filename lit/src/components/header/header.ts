import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { Pages, RouterService } from "../../services/router_service";

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
          <h1>${this.renderTitle()}</h1>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "page-header": Header;
  }
}
