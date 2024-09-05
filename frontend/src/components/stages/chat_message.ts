import "../participant_profile/profile_avatar";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";

import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { Timestamp } from "firebase/firestore";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment.service";
import { ParticipantService } from "../../services/participant.service";

import {
  ChatMessage,
  ChatMessageType,
  ParticipantChatMessage
} from '@deliberation-lab/utils';

import { styles } from "./chat_message.scss";

/** Chat message component */
@customElement("chat-message")
export class ChatMessageComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() chat: ChatMessage|undefined = undefined;

  override render() {
    if (!this.chat) {
      return nothing;
    }

    switch(this.chat.type) {
      case ChatMessageType.PARTICIPANT:
        return this.renderParticipantMessage(this.chat);
      default:
        return nothing;
    }
  }


  renderParticipantMessage(chatMessage: ParticipantChatMessage) {
    const classes = classMap({
      "chat-message": true,
      "current-user": chatMessage.participantPublicId === this.participantService.profile?.publicId
    });

    const profile = chatMessage.profile;

    return html`
      <div class=${classes}>
        <profile-avatar .emoji=${profile.avatar}></profile-avatar>
          <div class="content">
          <div class="label">
            ${profile.name ?? chatMessage.participantPublicId}
            ${profile.pronouns ? `(${profile.pronouns})` : ""}
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-message": ChatMessageComponent;
  }
}
