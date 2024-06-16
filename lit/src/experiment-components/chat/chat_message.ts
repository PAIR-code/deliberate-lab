import "../profile/profile_avatar";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";

import { styles } from "./chat_message.scss";
import { DiscussItemsMessage, MediatorMessage, Message, MessageKind, UserMessage, getDefaultUserMessage } from "@llm-mediation-experiments/utils";
import { Timestamp } from "firebase/firestore";

/** Chat message component */
@customElement("chat-message")
export class ChatMessage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

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
    const profile = this.experimentService.getParticipantProfile(
      message.fromPublicParticipantId
    );

    if (profile === undefined) {
      return nothing;
    }

    const classes = classMap({
      "chat-message": true,
      "current-user":  profile.publicId === this.participantService.profile?.publicId
    });

    return html`
      <div class=${classes}>
        <profile-avatar .emoji=${profile.avatarUrl}></profile-avatar>
          <div class="content">
          <div class="label">
            ${profile.name ?? profile.publicId}
            ${profile.pronouns ? `(${profile.pronouns})` : ""}
          </div>
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
