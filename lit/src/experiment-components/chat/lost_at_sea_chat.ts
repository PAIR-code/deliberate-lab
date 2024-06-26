import "../../pair-components/button";

import "../footer/footer";
import "../profile/profile_avatar";
import "../progress/progress_end_chat";
import "../progress/progress_stage_waiting";
import "./chat_interface";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ChatService } from "../../services/chat_service";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";

import {
    ChatKind,
    GroupChatStageConfig,
    ItemName,
    ITEMS
} from "@llm-mediation-experiments/utils";

import { getChatRatingsToDiscuss } from "../../shared/utils";

import { styles } from "./lost_at_sea_chat.scss";

/** Ranking chat stage (discuss different item pairs). */
@customElement("lost-at-sea-chat")
export class RankingChat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: GroupChatStageConfig|null = null;

  override render() {
    if (this.stage === null ||
        this.stage.chatConfig.kind !== ChatKind.ChatAboutItems) {
      return nothing;
    }

    const currentStage = this.stage.name!;
    const { ready, notReady } =
      this.experimentService.getParticipantsReadyForStage(currentStage);

    if (notReady.length > 0) {
      return html`
        <progress-stage-waiting .stageName=${currentStage}>
        </progress-stage-waiting>
      `;
    }
    const disableInput = !this.participantService.isCurrentStage;

    const numDiscussions = getChatRatingsToDiscuss(this.stage!).length;
    const showNext =
      this.chatService.getCurrentRatingIndex() >= numDiscussions;

    return html`
      <div class="chat-interface-wrapper">
        <div class="panel">
          ${this.renderParticipants()}
          ${this.renderTask()}
        </div>
        <chat-interface .disableInput=${disableInput}></chat-interface>
      </div>
      <stage-footer .disabled=${!showNext}>
      </stage-footer>
    `;
  }

  private renderParticipants() {
    return html`
      <div class="panel-item">
        <div class="panel-item-title">Participants</div>
        ${this.experimentService.getParticipantProfiles().map(p =>
          html`
            <div class="profile">
              <profile-avatar .emoji=${p.avatarUrl}></profile-avatar>
              <div>${p.name} (${p.pronouns})</div>
            </div>
          `)}
      </div>
    `;
  }

  private getLabel() {
    const rating = this.chatService.getCurrentRatingIndex() + 1;
    const numDiscussions = getChatRatingsToDiscuss(this.stage!).length;

    if (rating < numDiscussions) {
      return `Discussion ${rating} of ${numDiscussions}`;
    } else {
      return `Discussion ${numDiscussions} of ${numDiscussions}`;
    }
  }

  private renderItem(item: ItemName) {
    return html`
      <div class="item">
        <div class="img-wrapper">
          <img src=${ITEMS[item].imageUrl} />
        </div>
        ${ITEMS[item].name}
      </div>
    `;
  }

  private renderTask() {
    const index = this.chatService.getCurrentRatingIndex();
    const ratings = getChatRatingsToDiscuss(this.stage!);
    const pair = ratings[Math.min(index, ratings.length - 1)];

    const readyToEnd = this.experimentService.getParticipantReadyToEndChat(
      this.stage!.name, this.participantService.profile!.publicId,
    );

    if (index >= length) {
      return html`
        <div class="panel-item">
          <div class="panel-item-title">Discussions</div>
          <div>${length} of ${length} discussions completed.</div>
        </div>
      `;
    }

    return html`
      <div class="panel-item">
        <div class="panel-item-title">${this.getLabel()}</div>
        <div class="pair">
          ${pair ? this.renderItem(pair!.item1) : nothing}
          ${pair ? this.renderItem(pair!.item2) : nothing}
        </div>
        <pr-button
          color="tertiary"
          variant="tonal"
          ?disabled=${readyToEnd || (index >= length)}
          @click=${() => {
            this.chatService.markReadyToEndChat(true); }}
        >
          Ready to end discussion
        </pr-button>
        <div>You can still participate in the chat. When everyone is ready to end the discussion, the conversation will progress to the next stage.</div>
        <progress-end-chat .stageName=${this.stage!.name}></progress-end-chat>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lost-at-sea-chat": RankingChat;
  }
}
