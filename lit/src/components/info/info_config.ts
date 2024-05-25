import "../../pair-components/textarea";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { StageType } from "../../shared/types";

import { styles } from "./info_config.scss";

/** Info config */
@customElement("info-config")
export class InfoConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  override render() {
    const handleNameInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentService.updateCurrentStageName(value);
    };

    const handleContentInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentService.updateCurrentStageContent(value);
    };

    return html`
      <pr-textarea
        label="Stage name"
        variant="outlined"
        @input=${handleNameInput}
        .value=${this.experimentService.currentStage.name}>
      </pr-textarea>
      <pr-textarea
        label="Info content"
        variant="outlined"
        @input=${handleContentInput}
        .value=${this.experimentService.currentStage.type === StageType.INFO ? this.experimentService.currentStage.content : ""}>
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "info-config": InfoConfig;
  }
}
