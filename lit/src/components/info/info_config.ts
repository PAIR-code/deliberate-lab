import "../../pair-components/textarea";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { styles } from "./info_config.scss";

/** Info config */
@customElement("info-config")
export class InfoConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    const handleNameInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
    };

    const handleContentInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
    };

    return html`
      <pr-textarea
        label="Stage name"
        variant="outlined"
        @input=${handleNameInput}
      >
      </pr-textarea>
      <pr-textarea
        label="Info content"
        variant="outlined"
        @input=${handleContentInput}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "info-config": InfoConfig;
  }
}
