import "../../pair-components/textarea";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";

import { styles } from "./chat_config.scss";

/** Chat config */
@customElement("chat-config")
export class ChatConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @state() value = '';

  override render() {
    const handleInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
       this.value = value;
    };

    return html`
      <pr-textarea
        label="Stage name"
        variant="outlined"
        @input=${handleInput}
        .value=${this.value}
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
