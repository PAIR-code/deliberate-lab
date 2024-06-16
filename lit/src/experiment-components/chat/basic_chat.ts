import "../../pair-components/button";

import "./chat_interface";
import "../footer/footer";
import "../progress/progress_end_chat";
import "../progress/progress_stage_waiting";

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

  override render() {
    const currentStage = this.routerService.activeRoute.params["stage"];
    const { ready, notReady } =
      this.experimentService.getParticipantsReadyForStage(currentStage);

    if (notReady.length > 0) {
      return html`
        <progress-stage-waiting .stageName=${currentStage}>
        </progress-stage-waiting>
      `;
    }

    const publicId = this.participantService.profile?.publicId!;
    const readyToEnd = this.experimentService.isReadyToEndChat(
      currentStage, publicId
    );

    const disableInput = !this.participantService.isCurrentStage || readyToEnd;

    return html`
      <chat-interface .disableInput=${disableInput}></chat-interface>
      <stage-footer .disabled=${!readyToEnd}>
        <pr-button
          color="tertiary"
          variant="tonal"
          ?disabled=${readyToEnd}
          @click=${() => { this.chatService.markReadyToEndChat(true); }}
        >
          Ready to end discussion
        </pr-button>
        <progress-end-chat .stageName=${currentStage}></progress-end-chat>
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "basic-chat": BasicChat;
  }
}
