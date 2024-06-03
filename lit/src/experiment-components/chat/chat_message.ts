import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";

import { styles } from "./chat_message.scss";
import { DiscussItemsMessage, MediatorMessage, Message, MessageKind, UserMessage, getDefaultUserMessage } from "@llm-mediation-experiments/utils";
import { Timestamp } from "firebase/firestore";

/** Chat message component */
@customElement("chat-message")
export class ChatMessage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  @property() chatMessage: Message = getDefaultUserMessage(Timestamp.now());

  override render() {
    
    switch(this.chatMessage.kind) {
      case MessageKind.UserMessage:
        return this.renderUserMessage(this.chatMessage);
      case MessageKind.MediatorMessage:
        return this.renderMediatorMessage(this.chatMessage);
      case MessageKind.DiscussItemsMessage:
        return this.renderDiscussItemsMessage(this.chatMessage);
    }
  }


  renderUserMessage(message: UserMessage) {
    
    const classes = classMap({
      "chat-message": true,
      // TODO: find a better way to identify the user. Participants are not authenticated through Firestore,
      // they use their private participant ID as a login, and their local "public" ID (e.g. "participant-0", etc)
      // to communicate with others.
      "current-user":  message.fromPublicParticipantId === this.authService.userId
    });

    // TODO: participant profiles can be accessed in the experiment metadata (names, avatars, etc.)
    return html`
      <div class=${classes}>
        <div class="avatar"></div>
        <div class="content">
          <div class="label">${message.fromPublicParticipantId}</div>
          <div class="chat-bubble">${message.text}</div>
        </div>
      </div>
    `;
  }

  renderMediatorMessage(message: MediatorMessage) {

    const classes = classMap({
      "chat-message": true,
    });

    return html`
      <div class=${classes}>
        <div class="avatar"></div>
        <div class="content">
          <div class="label">Mediator</div>
          <div class="chat-bubble">${message.text}</div>
        </div>
      </div>
    `;
  }

  renderDiscussItemsMessage(message: DiscussItemsMessage) {

    const classes = classMap({
      "chat-message": true,
    });

    // TODO: display the pair of items being discussed
    return html`
      <div class=${classes}>
        <div class="avatar"></div>
        <div class="content">
          <div class="label">TODO</div>
          <div class="chat-bubble">${message.text}</div>
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
