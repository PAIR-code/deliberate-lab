import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";

import { styles } from "./chat_message.scss";

/** Chat message component */
@customElement("chat-message")
export class ChatMessage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  @property() chatMessage = "";
  @property() author = "";
  @observable private isLoading = false;

  override render() {
    const classes = classMap({
      "chat-message": true,
      "current-user": this.author === this.authService.userId
    });

    return html`
      <div class=${classes}>
        <div class="avatar"></div>
        <div class="content">
          <div class="label">${this.author}</div>
          <div class="chat-bubble">${this.chatMessage}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-message": ChatMessage;
  }
}
