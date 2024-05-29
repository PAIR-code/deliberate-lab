import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";
import "./chat_message";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";

import { ChatMessage } from "../../shared/types";

import { styles } from "./chat_interface.scss";

/** Chat interface component */
@customElement("chat-interface")
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() value = "";
  private readonly chatService = core.getService(ChatService);

  private sendUserInput() {
    this.chatService.addChatMessage(this.value);
    this.value = "";
  }

  private renderChatMessage(chatMessage: ChatMessage) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message
          .chatMessage=${chatMessage.content}
          .author=${chatMessage.author}>
        </chat-message>
      </div>
    `;
  }

  private renderChatHistory() {
    return html`
      <div class="chat-scroll">
        <div class="chat-history">
          ${this.chatService.chats.map(this.renderChatMessage.bind(this))}
        </div>
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

  override render() {
    return html`
      <div class="chat">
        ${this.renderChatHistory()}
        <div class="input-row-wrapper">
          <div class="input-row">${this.renderInput()}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-interface": ChatInterface;
  }
}