import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import './chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {FirebaseService} from '../../services/firebase.service';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {
  ChatDiscussion,
  ChatDiscussionType,
  ChatMessage,
  ChatStageConfig,
  DiscussionItem,
  ParticipantProfile,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {styles} from './chat_interface.scss';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() stage: ChatStageConfig|undefined = undefined;
  @property() value = '';
  @property() disableInput = false;
  @property() showInfo = false;
  @property() readyToEndDiscussionLoading = false;

  private sendUserInput() {
    if (this.value.trim() === '') return;
    this.participantService.createChatMessage(
      { message: this.value.trim() }
    );
    this.value = '';
  }

  private renderChatMessage(chatMessage: ChatMessage) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message .chat=${chatMessage}></chat-message>
      </div>
    `;
  }

  private renderChatHistory(currentDiscussionId: string|null) {
    const stageId = this.routerService.activeRoute.params['stage'];
    const stage = this.experimentService.getStage(stageId);
    if (!stage || stage.kind !== StageKind.CHAT) return nothing;

    // If discussion threads, render each thread
    if (stage.discussions.length > 0) {
      let discussions = stage.discussions;
      // Only show discussion threads that have been unlocked
      if (currentDiscussionId !== null) {
        const index = discussions.findIndex(discussion => discussion.id === currentDiscussionId);
        discussions = discussions.slice(0, index + 1);
      }

      return html`
        <div class="chat-scroll">
          <div class="chat-history">
            ${discussions.map((discussion, index) =>
              this.renderChatDiscussionThread(stage, index))}
          </div>
        </div>
      `;
    }

    // Otherwise, render all messages in non-discussion chatMap
    const messages = this.cohortService.chatMap[stageId];
    if (!messages) return nothing;

    return html`
      <div class="chat-scroll">
        <div class="chat-history">
          ${messages.map(this.renderChatMessage.bind(this))}
        </div>
      </div>
    `;
  }

  private renderChatDiscussionThread(
    stage: ChatStageConfig,
    discussionIndex: number,
  ) {
    const discussion = stage.discussions[discussionIndex];

    const renderMessages = () => {
      const stageMap = this.cohortService.chatDiscussionMap[stage.id];
      if (!stageMap) return nothing;

      const messages = stageMap[discussion.id] ?? [];
      return html`${messages.map(this.renderChatMessage.bind(this))}`;
    };

    const renderDiscussionItems = () => {
      if (discussion.type !== ChatDiscussionType.COMPARE) return nothing;

      return html`
        <div class="discussion-items">
          ${discussion.items.map(item => renderDiscussionItem(item))}
        </div>
      `;
    };

    const renderDiscussionItem = (item: DiscussionItem) => {
      const renderImage = () => {
        if (item.imageId.length === 0) return nothing;

        const image = document.createElement('img');
        this.firebaseService.setImage(image, item.imageId);

        return html`<div class="img-wrapper">${image}</div>`;
      };

      return html`
        <div class="discussion-item">
          ${renderImage()}
          ${item.name}
        </div>
      `;
    };

    return html`
      <div class="discussion">
        <div class="discussion-title">
          Discussion ${discussionIndex + 1} of ${stage.discussions.length}
        </div>
        ${discussion.description.length > 0 ?
          html`<div>${discussion.description}</div>` : nothing}
        ${renderDiscussionItems()}
      </div>
      ${renderMessages()}
    `;
  }

  private renderInput() {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
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
          ?disabled=${this.disableInput || this.participantService.disableStage}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send message"
          color="tertiary"
          variant="outlined"
          position="TOP_END"
        >
          <pr-icon-button
            icon="send"
            variant="tonal"
            .disabled=${this.value.trim() === '' || this.disableInput || this.participantService.disableStage}
            ?loading=${this.participantService.isSendingChat}
            @click=${this.sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    </div>`;
  }

  private renderEndDiscussionButton(currentDiscussionId: string|null) {
    if (!this.stage || !currentDiscussionId) {
      return nothing;
    }

    const onClick = async () => {
      if (!this.stage) return;

      this.readyToEndDiscussionLoading = true;
      await this.participantService.updateReadyToEndChatDiscussion(
        this.stage.id,
        currentDiscussionId
      );
      this.readyToEndDiscussionLoading = false;
    };

    return html`
      <pr-button
        color="tertiary"
        variant="tonal"
        ?disabled=${this.participantService.disableStage
          || this.participantService.isReadyToEndChatDiscussion(this.stage.id, currentDiscussionId)}
        ?loading=${this.readyToEndDiscussionLoading}
        @click=${onClick}
      >
        Ready to end discussion
      </pr-button>
    `;
  }

  override render() {
    if (!this.stage) return nothing;
    const currentDiscussionId = this.cohortService.getChatDiscussionId(
      this.stage.id
    );

    return html`
      <div class="chat-content">
        ${this.cohortService.isChatLoading ?
          html`<div>Loading...</div>` : this.renderChatHistory(currentDiscussionId)}
      </div>
      <div class="input-row-wrapper">
        <div class="input-row">${this.renderInput()}</div>
      </div>
      <stage-footer .showNextButton=${currentDiscussionId === null}>
        ${this.renderEndDiscussionButton(currentDiscussionId)}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
