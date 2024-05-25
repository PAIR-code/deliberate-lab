import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { styles } from "./chat_message.scss";

/** Chat message component */
@customElement("chat-message")
export class ChatMessage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() chatMessage = "";
  @property() author = "";
  @observable private isLoading = false;

  private renderBody() {
    const chatBubbleClasses = classMap({
      "chat-bubble": true,
      "other-user": this.author === "experimenter", // TODO: Add real logic
    });

    return html`
      <div class=${chatBubbleClasses}>
        <div class="chat-body">
          ${this.chatMessage}
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="bubble">
        ${this.renderBody()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-message": ChatMessage;
  }
}
