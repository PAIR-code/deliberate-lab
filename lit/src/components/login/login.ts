import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";

import { styles } from "./login.scss";

/** Login page component */
@customElement("login-page")
export class Login extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  override render() {
    return html`
      <h1>🕊️ LLM Mediators</h1>
      <div class="cards-wrapper">
        ${this.renderParticipantLogin()}
        ${this.renderExperimenterLogin()}
      </div>
    `;
  }

  private renderParticipantLogin() {
    return html`
      <div class="card">
        <h2>Participant login</h2>
        <div>Coming soon.</div>
      </div>
    `;
  }

  private renderExperimenterLogin() {
    const handleLogin = () => {
      this.authService.signInWithGoogle();
    };

    return html`
      <div class="card">
        <h2>Experimenter login</h2>
        <pr-button @click=${handleLogin}>Sign in with Google</pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "login-page": Login;
  }
}
