import "../../pair-components/button";
import "../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { AnalyticsService, ButtonClick } from "../../services/analytics.service";
import { AuthService } from "../../services/auth.service";
import { APP_NAME } from "../../shared/constants";

import { styles } from "./login.scss";

/** Login page component */
@customElement("login-page")
export class Login extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);

  @state() experimentId = "";
  @state() participantId = "";

  override render() {
    const handleLogin = () => {
      this.analyticsService.trackButtonClick(ButtonClick.LOGIN);
      this.authService.signInWithGoogle();
    };

    // TODO: Enable developers to customize info by importing a Git-ignored
    // app_info.md file (and push app_info.example.md to repository)
    return html`
      <div class="login">
        <h1>🕊️ Welcome to ${APP_NAME}</h1>
        <div>
          ${APP_NAME} is
          <a href="https://github.com/PAIR-code/deliberate-lab/wiki" target="blank">
            an open-source platform
          </a>
          for running online research experiments on human + LLM group dynamics.
        </div>
        <div class="info">
          <div>
            ⚠️ The owner(s) of this deployment will have access to any
            experiment data created.
            Contact the owner(s) for information about analytics
            tracking, data retention policies, etc.
          </div>
          <div>
            To run the platform locally or create your own deployment,
            <a href="https://github.com/PAIR-code/deliberate-lab" target="_blank">
            clone ${APP_NAME} on GitHub</a>.
          </div>
        </div>
        <div class="info">
          <div>
            📋 The platform is currently closed access.
            If you're a researcher interested in running experiments on this platform, please reach out to the developers through 
             <a href="https://github.com/PAIR-code/deliberate-lab/issues/new" target="_blank">Github</a>.
          </div>
        </div>
        <div class="action-buttons">
          <pr-button @click=${handleLogin}>Sign in with Google</pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "login-page": Login;
  }
}
