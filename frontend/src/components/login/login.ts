import "../../pair-components/button";
import "../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth.service";
import { Pages, RouterService } from "../../services/router.service";

import { APP_NAME } from "../../shared/constants";

import { styles } from "./login.scss";

/** Login page component */
@customElement("login-page")
export class Login extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);

  @state() experimentId = "";
  @state() participantId = "";

  override render() {
    return html`
      <h1>${APP_NAME}</h1>
      <div class="cards-wrapper">
        ${this.renderParticipantLogin()}
        ${this.renderExperimenterLogin()}
      </div>
    `;
  }

  private renderParticipantLogin() {
    const handleLogin = () => {
      this.routerService.navigate(
        Pages.PARTICIPANT,
        {
          "experiment": this.experimentId,
          "participant": this.participantId
        }
      );
    };

    return html`
      <div class="card">
        <h2>Participant login</h2>
        <pr-textarea
          label="Experiment ID"
          placeholder="Enter experiment ID"
          variant="outlined"
          .value=${this.experimentId}
          @input=${(e: Event) => this.experimentId = (e.target as HTMLInputElement).value}
        ></pr-textarea>
        <pr-textarea
          label="Participant ID"
          placeholder="Enter participant ID"
          variant="outlined"
          .value=${this.participantId}
          @input=${(e: Event) => this.participantId = (e.target as HTMLInputElement).value}
        ></pr-textarea>
        <pr-button
          ?disabled=${this.experimentId === "" || this.participantId === ""}
          @click=${handleLogin}>
          Login
        </pr-button>
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
