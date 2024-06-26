import "../profile/profile_avatar";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { DiscussItemsMessage, ITEMS, MediatorMessage, Message, MessageKind, UserMessage, getDefaultUserMessage } from "@llm-mediation-experiments/utils";
import { Timestamp } from "firebase/firestore";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";

import { styles } from "./chat_message.scss";

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
        <profile-avatar .emoji=${message.avatar}></profile-avatar>
        <div class="content">
          <div class="label">${message.name}</div>
          <div class="mediator-bubble">${message.text}</div>
        </div>
      </div>
    `;
  }

  renderDiscussItemsMessage(message: DiscussItemsMessage) {
    const classes = classMap({
      "discuss-message": true,
    });

    // TODO: display the pair of items being discussed
    return html`
      <div class=${classes}>
        <div class="discuss-title">${message.text}</div>
        <div class="pair">
          <div class="item">
            <div class="img-wrapper">
              <img src=${ITEMS[message.itemPair.item1].imageUrl} />
            </div>
            <div>${ITEMS[message.itemPair.item1].name}</div>
          </div>
          <div class="item">
            <div class="img-wrapper">
              <img src=${ITEMS[message.itemPair.item2].imageUrl} />
            </div>
            <div>${ITEMS[message.itemPair.item2].name}</div>
          </div>
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
