import "../../pair-components/button";

import "./chat_interface";
import "../footer/footer";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";
import { RouterService } from "../../services/router_service";

import { styles } from "./basic_chat.scss";

/** Basic chat stage (no discussion topics). */
@customElement("basic-chat")
export class BasicChat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  private readyToEnd() {
    const currentStage = this.routerService.activeRoute.params["stage"];
    const publicId = this.participantService.profile?.publicId!;

    return this.experimentService.isReadyToEndChat(currentStage, publicId);
  }

  private disableInput() {
    return !this.participantService.isCurrentStage() || this.readyToEnd();
  }

  override render() {
    return html`
      <chat-interface .disableInput=${this.disableInput()}></chat-interface>
      <stage-footer .disabled=${!this.readyToEnd()}>
        <pr-button
          color="tertiary"
          variant="tonal"
          ?disabled=${this.readyToEnd()}
          @click=${() => { this.chatService.markReadyToEndChat(true); }}
        >
          Ready to end discussion
        </pr-button>
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "basic-chat": BasicChat;
  }
}
