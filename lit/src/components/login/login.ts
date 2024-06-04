import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";

import { styles } from "./login.scss";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";

/** Login page component */
@customElement("login-page")
export class Login extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);


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
    let experimentId = "";
    let participantId = "";

    const handleLogin = () => {
      this.authService.participant = { experimentId, participantId };

      // Load the participant and experiment data
      this.experimentService.setExperimentId(experimentId);
      this.participantService.setParticipant(experimentId, participantId);
    }

    return html`
      <div class="card">
        <h2>Participant login</h2>
        <pr-textarea
          label="Experiment ID"
          variant="outlined"
          .value=${experimentId}
          @input=${(e: Event) => experimentId = (e.target as HTMLInputElement).value}
        ></pr-textarea>
        <pr-textarea
          label="Participant ID"
          variant="outlined"
          .value=${participantId}
          @input=${(e: Event) => participantId = (e.target as HTMLInputElement).value}
        ></pr-textarea>

        <pr-button @click=${handleLogin}>Login</pr-button>
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
