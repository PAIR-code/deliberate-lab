import "./components/header/header";
import "./components/home/home";
import "./components/settings/settings";
import "./components/sidenav/sidenav";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "./core/core";
import { Pages, RouterService } from "./services/router_service";
import { SettingsService } from "./services/settings_service";

import { ColorMode, ColorTheme, TextSize } from "./shared/types";

import { styles } from "./app.scss";

/** App main component. */
@customElement("llm-mediation-app")
export class App extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);

  override connectedCallback() {
    super.connectedCallback();
  }

  private renderPageContent() {
    if (this.routerService.activePage === Pages.HOME) {
      return html`<home-page></home-page>`
    } else if (this.routerService.activePage === Pages.SETTINGS) {
      return html`<settings-page></settings-page>`;
    }
    return html`<div>404: Page not found</div>`
  }

  override render() {
    const isMode = (mode: ColorMode) => {
      return this.settingsService.colorMode === mode;
    }

    const isTheme = (theme: ColorTheme) => {
      return this.settingsService.colorTheme === theme;
    };

    const isSize = (size: TextSize) => {
      return this.settingsService.textSize === size;
    };

    const classes = classMap({
      "app-wrapper": true,
      "mode--dark": isMode(ColorMode.DARK),
      "mode--light": isMode(ColorMode.LIGHT),
      "mode--default": isMode(ColorMode.DEFAULT),
      "size--small": isSize(TextSize.SMALL),
      "size--medium": isSize(TextSize.MEDIUM),
      "size--large": isSize(TextSize.LARGE),
    });

    return html`
      <div class=${classes}>
        <main>
          <sidenav-menu></sidenav-menu>
          <div class="content-wrapper">
            <page-header></page-header>
            <div class="content">
              ${this.renderPageContent()}
            </div>
          </div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "llm-mediation-app": App;
  }
}
