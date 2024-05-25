import "../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from "../../services/router_service";

import { ExperimentStage } from "../../shared/types";

import { styles } from "./sidenav.scss";

/** Sidenav menu component */
@customElement("sidenav-menu")
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      <div class="top">
        ${this.renderCurrentExperimentItem()}
        ${this.experimentService.stages.map(
          (stage: ExperimentStage, index: number) =>
          this.renderStageItem(stage, index)
        )}
      </div>
      <div class="bottom">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.showInSidenav
        ).map((navItem) => this.renderNavItem(navItem))}
      </div>
    `;
  }

  private renderCurrentExperimentItem() {
    const navItemClasses = classMap({
      "nav-item": true,
      selected: this.routerService.activePage === Pages.EXPERIMENT,
    });

    const handleClick = (e: Event) => {
      // TODO: Use real experiment ID
      this.routerService.navigate(Pages.EXPERIMENT, { "experiment": "1" });
    }

    return html`
      <div class=${navItemClasses} role="button" @click=${handleClick}>
        My Experiment
      </div>
    `;
  }

  private renderStageItem(stage: ExperimentStage, index: number) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected: this.routerService.activePage === Pages.EXPERIMENT_STAGE &&
        this.routerService.activeRoute.params["stage"] === stage.id,
    });

    const handleClick = (e: Event) => {
      // TODO: Use real experiment ID
      this.routerService.navigate(Pages.EXPERIMENT_STAGE,
        { "experiment": "1", "stage": stage.id });
      }

    return html`
      <div class=${navItemClasses} role="button" @click=${handleClick}>
        ${index + 1}. ${stage.name}
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
