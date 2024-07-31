import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";
import "../mediators/mediator_config";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ChatService } from "../../services/chat_service";
import { ExperimentService } from "../../services/experiment_service";
import { RouterService } from "../../services/router_service";

import { StageKind } from "@llm-mediation-experiments/utils";
import { createMediator } from "../../shared/utils";

import { styles } from "./mediator_chat_panel.scss";

/** Mediator chat panel (visible to experimenters only). */
@customElement("mediator-chat-panel")
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @state() value = "";
  @state() mediator = createMediator();
  @state() showMediationPanel = false;

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const stageId = this.routerService.activeRoute.params["stage"];
    const stage = this.experimentService.getStage(stageId);
    if (!stage || stage.kind !== StageKind.GroupChat) {
      return nothing;
    }

    return html`
      ${this.renderMediationButton()}
      ${this.renderMediationPanel()}
    `;
  }

  private renderMediationButton() {
    const onClick = () => {
      this.showMediationPanel = !this.showMediationPanel;
    }

    return html`
      <pr-icon-button
        icon=${this.showMediationPanel ? 'visibility_off' : 'visibility'}
        variant="tonal"
        @click=${onClick}
      >
      </pr-icon-button>
    `;
  }

  private renderMediationPanel() {
    if (!this.showMediationPanel) {
      return nothing;
    }

    const onSendLLMMessage = () => {
      this.chatService.sendLLMMediatorMessage(this.mediator);
    };

    return html`
      <div class="mediation-panel-wrapper">
        <div class="mediation-panel">
          <mediator-config .mediator=${this.mediator} .showKind=${false}>
          </mediator-config>
          <pr-button @click=${onSendLLMMessage}>
            Send LLM-generated message
          </pr-button>
        </div>
        ${this.renderMediationInput()}
      </div>
    `;
  }

  private renderMediationInput() {
    const sendUserInput = () => {
      this.chatService.sendMediatorMessage(
        this.value,
        this.mediator.name,
        this.mediator.avatar
      );
      this.value = "";
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        sendUserInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      this.value = (e.target as HTMLTextAreaElement).value;
    };

    return html`
      <div class="mediation-input">
        <pr-textarea
          size="small"
          placeholder="Send message"
          .value=${this.value}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send mediator message"
          color="secondary"
          variant="outlined"
          position="TOP_RIGHT"
        >
          <pr-icon-button
            icon="send"
            color="secondary"
            variant="tonal"
            @click=${sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mediator-chat-panel": ChatPanel;
  }
}
