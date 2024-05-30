import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { Experiment } from '@llm-mediation-experiments/utils';

import { core } from "../../core/core";
import { FirebaseService } from "../../services/firebase_service";

import { StageKind } from "../../shared/types";

import { styles } from "./home.scss";

/** Home page component */
@customElement("home-page")
export class Home extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly firebaseService = core.getService(FirebaseService);

  override render() {
    const handleCreate = () => {
      this.firebaseService.createExperiment(
        "Test experiment",
        [{ kind: StageKind.Info, name: "Test stage", infoLines: ["Line 1"]}],
        1
      );
    }

    return html`
      <pr-button @click=${handleCreate}>New experiment</pr-button>
      <div class="cards-wrapper">
        ${this.firebaseService.experiments.map(
          experiment => this.renderExperimentCard(experiment)
        )}
      </div>
    `;
  }

  private renderExperimentCard(experiment: Experiment) {
    const handleDelete = () => {
      this.firebaseService.deleteExperiment(experiment.id);
    };

    return html`
      <div class="card">
        <h2>${experiment.name}</h2>
        <p>Id: ${experiment.id}</p>
        <div class="action-buttons">
          <pr-tooltip text="Delete experiment" position="BOTTOM_END">
            <pr-icon-button
              icon="delete"
              color="error"
              variant="default"
              @click=${handleDelete}>
            </pr-icon-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": Home;
  }
}
