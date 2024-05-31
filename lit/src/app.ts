import "./components/chat/chat_config";
import "./components/chat/chat_interface";
import "./components/experiment/experiment_config";
import "./components/header/header";
import "./components/home/home";
import "./components/info/info_config";
import "./components/login/login";
import "./components/settings/settings";
import "./components/sidenav/sidenav";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "./core/core";
import { AuthService } from "./services/auth_service";
import { ChatService } from "./services/chat_service";
import { ExperimentService } from "./services/experiment_service";
import { Pages, RouterService } from "./services/router_service";
import { SettingsService } from "./services/settings_service";

import {
  ColorMode,
  ColorTheme,
  Permission,
  StageType,
  TextSize
} from "./shared/types";

import { styles } from "./app.scss";

/** App main component. */
@customElement("llm-mediation-app")
export class App extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
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
    } else if (this.routerService.activePage === Pages.EXPERIMENT) {
      const id = this.routerService.activeRoute.params["experiment"];
      this.experimentService.setExperimentId(id);
      return html`
        ${this.authService.permission === Permission.EDIT ?
          html`<experiment-config></experiment-config>` :
          html`<div>Experiment intro goes here.</div>`}
      `;
    } else if (this.routerService.activePage === Pages.EXPERIMENT_STAGE) {
      const stageId = this.routerService.activeRoute.params["stage"];
      this.experimentService.setCurrentStage(stageId);

      const currentStage = this.experimentService.currentStage;

      if (currentStage?.type === StageType.CHAT) {
        this.chatService.setChats(currentStage.messages);

        if (this.authService.permission === Permission.EDIT) {
          return html`<chat-config></chat-config>`;
        } else {
          return html`<chat-interface></chat-interface>`;
        }
      }
      if (currentStage?.type === StageType.INFO) {
        if (this.authService.permission === Permission.EDIT) {
          return html`<info-config></info-config>`;
        } else {
          return currentStage.type === StageType.INFO ?
            html`<div>${currentStage.content}</div>` : nothing;
        }
      }
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

    if (!this.authService.authenticated) {
      // Render login screen if relevant after initial auth check
      return html`
        <div class=${classes}>
          <div class="content">
            ${this.authService.initialAuthCheck ?
              html`<login-page></login-page>` :
              nothing}
          </div>
        </div>
      `;
    }

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
