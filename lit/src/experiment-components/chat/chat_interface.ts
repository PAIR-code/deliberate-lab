import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "./chat_message";
import "../footer/footer";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";
import { RouterService } from "../../services/router_service";

import { styles } from "./chat_interface.scss";
import { Message, ParticipantProfile } from "@llm-mediation-experiments/utils";

/** Chat interface component */
@customElement("chat-interface")
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() value = "";

  private sendUserInput() {
    this.chatService.sendUserMessage(this.value.trim());
    this.value = "";
  }

  private renderChatMessage(chatMessage: Message) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message
          .chatMessage=${chatMessage}
        </chat-message>
      </div>
    `;
  }

  private renderChatHistory() {
    return html`
      <div class="chat-scroll">
        <div class="chat-history">
          ${this.chatService.messages.map(this.renderChatMessage.bind(this))}
        </div>
      </div>
    `;
  }

  private renderChatIntro() {
    const renderParticipant = (participant: ParticipantProfile) => {
      return html`
        <div class="chat-participant">
          <profile-avatar .emoji=${participant.avatarUrl}></profile-avatar>
          <div>
            ${participant.name ?? participant.publicId}
            (${participant.pronouns})
          </div>
        </div>
      `;
    };

    return html`
      <div class="chat-info">
        <div class="chat-participants-wrapper">
          ${this.experimentService.participants.map(participant =>
            renderParticipant(participant))}
        </div>
        <div class="divider"></div>
        <div class="label">Group Discussion</div>
      </div>
    `;
  }

  private renderInput() {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.sendUserInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      this.value = (e.target as HTMLTextAreaElement).value;
    };

    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    return html`<div class="input-wrapper">
      <div class="input">
        <pr-textarea
          size="small"
          placeholder="Send message"
          .value=${this.value}
          ?focused=${autoFocus()}
          ?disabled=${!this.participantService.isCurrentStage() || this.readyToEnd()}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send message"
          color="tertiary"
          variant="outlined"
          position="TOP_RIGHT"
        >
          <pr-icon-button
            icon="send"
            variant="tonal"
            .disabled=${this.value === ""}
            @click=${this.sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    </div>`;
  }

  private readyToEnd() {
    const currentStage = this.routerService.activeRoute.params["stage"];
    const publicId = this.participantService.profile?.publicId!;

    return this.experimentService.isReadyToEndChat(currentStage, publicId);
  }

  override render() {
    return html`
      <div class="chat">
        <div class="chat-content">
          ${this.renderChatIntro()}
          ${this.renderChatHistory()}
        </div>
        <div class="input-row-wrapper">
          <div class="input-row">${this.renderInput()}</div>
        </div>
      </div>
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
    "chat-interface": ChatInterface;
  }
}
