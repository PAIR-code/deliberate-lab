import "../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
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
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      <div class="top">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.showInSidenav && navItem.isPrimaryPage
        ).map((navItem) => this.renderNavItem(navItem))}
      </div>
      <div class="bottom">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.showInSidenav && !navItem.isPrimaryPage
        ).map((navItem) => this.renderNavItem(navItem))}
      </div>
    `;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (e: Event) => {
      this.routerService.navigate(navItem.page);
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
