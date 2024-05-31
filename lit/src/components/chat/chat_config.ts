import "../../pair-components/textarea";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { styles } from "./chat_config.scss";

/** Chat config */
@customElement("chat-config")
export class ChatConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  override render() {
    const handleInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentService.updateCurrentStageName(value);
    };

    return html`
      <pr-textarea
        label="Stage name"
        variant="outlined"
        @input=${handleInput}
        .value=${this.experimentService.currentStage!.name}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-config": ChatConfig;
  }
}
