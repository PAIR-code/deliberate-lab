import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { ExperimentStage } from "../../shared/types";

import { styles } from "./experiment_config.scss";

/** Experiment config page component */
@customElement("experiment-config")
export class ExperimentConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  override render() {
    return html`
      <h2>Number of stages: ${this.experimentService.stages.length}</h2>
      <div class="stages-wrapper">
        ${this.experimentService.stages.map(
          (stage, index) => this.renderStage(stage, index)
        )}
      </div>
      ${this.renderAddStageButtons()}
    `;
  }

  private renderStage(stage: ExperimentStage, index: number) {
    return html`<p>${index + 1}. ${stage.name}</p>`;
  }

  private renderAddStageButtons() {
    const onAddChatClick = () => {
      this.experimentService.addChatStage();
    };

    const onAddInfoClick = () => {
      this.experimentService.addInfoStage();
    }

    return html`
      <div class="buttons-wrapper">
        <pr-button @click=${onAddChatClick}>Add chat stage</pr-button>
        <pr-button @click=${onAddInfoClick}>Add info stage</pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config": ExperimentConfig;
  }
}
