import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '../progress/progress_chat_discussion_completed';
import '../progress/progress_stage_completed';
import './chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {RouterService} from '../../services/router.service';

import {
  ChatDiscussion,
  ChatDiscussionType,
  ChatStagePublicData,
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

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly routerService = core.getService(RouterService);

  @property() stage: ChatStageConfig | undefined = undefined;
  @property() disableInput = false;
  @property() showInfo = false;
  @state() readyToEndDiscussionLoading = false;
  @state() isAlertLoading = false;

  private sendUserInput() {
    if (!this.stage) return;

    const value = this.participantAnswerService.getChatInput(this.stage.id);
    if (value.trim() === '') return;
    this.participantService.createChatMessage({message: value.trim()});
    this.participantAnswerService.updateChatInput(this.stage.id, '');
  }

  private renderChatMessage(chatMessage: ChatMessage) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message .chat=${chatMessage}></chat-message>
      </div>
    `;
  }

  private isConversationOver() {
    const stageId = this.participantService.currentStageViewId ?? '';
    const stage = this.experimentService.getStage(stageId);

    if (!stage || stage.kind !== StageKind.CHAT) return false; // Changed `nothing` to `false`
    const stageData = this.cohortService.stagePublicDataMap[
      stage.id
    ] as ChatStagePublicData;
    if (!stageData) return;
    return Boolean(stageData.discussionEndTimestamp);
  }

  private renderChatHistory(currentDiscussionId: string | null) {
    const stageId = this.participantService.currentStageViewId ?? '';
    const stage = this.experimentService.getStage(stageId);
    if (!stage || stage.kind !== StageKind.CHAT) return nothing;

    // Non-discussion messages
    const messages = this.cohortService.chatMap[stageId] ?? [];

    // If discussion threads, render each thread
    if (stage.discussions.length > 0) {
      let discussions = stage.discussions;
      // Only show discussion threads that have been unlocked
      if (currentDiscussionId !== null) {
        const index = discussions.findIndex(
          (discussion) => discussion.id === currentDiscussionId,
        );
        discussions = discussions.slice(0, index + 1);
      }

      return html`
        <div class="chat-scroll">
          <div class="chat-history">
            ${discussions.map((discussion, index) =>
              this.renderChatDiscussionThread(stage, index),
            )}
            ${messages.map(this.renderChatMessage.bind(this))}
          </div>
        </div>
      `;
    }

    // Otherwise, render all messages in non-discussion chatMap
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
          ${discussion.items.map((item) => renderDiscussionItem(item))}
        </div>
      `;
    };

    const renderDiscussionItem = (item: DiscussionItem) => {
      const renderImage = () => {
        if (item.imageId.length === 0) return nothing;

        return html`
          <div class="img-wrapper">
            <img src=${item.imageId} />
          </div>
        `;
      };

      return html`
        <div class="discussion-item">${renderImage()} ${item.name}</div>
      `;
    };

    return html`
      <div class="discussion">
        <div class="discussion-title">
          Discussion ${discussionIndex + 1} of ${stage.discussions.length}
        </div>
        ${discussion.description.length > 0
          ? html`<div>${discussion.description}</div>`
          : nothing}
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
      if (!this.stage) return;

      const value = (e.target as HTMLTextAreaElement).value;
      this.participantAnswerService.updateChatInput(this.stage.id, value);
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
          .value=${this.participantAnswerService.getChatInput(
            this.stage?.id ?? '',
          )}
          ?focused=${autoFocus()}
          ?disabled=${this.disableInput ||
          this.participantService.disableStage ||
          this.isConversationOver()}
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
            .disabled=${this.participantAnswerService
              .getChatInput(this.stage?.id ?? '')
              .trim() === '' ||
            this.disableInput ||
            this.participantService.disableStage ||
            this.isConversationOver()}
            ?loading=${this.participantService.isSendingChat}
            @click=${this.sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    </div>`;
  }

  private renderEndDiscussionButton(currentDiscussionId: string | null) {
    if (!this.stage || !currentDiscussionId) {
      return nothing;
    }

    const onClick = async () => {
      if (!this.stage) return;

      this.readyToEndDiscussionLoading = true;
      try {
        await this.participantService.updateReadyToEndChatDiscussion(
          this.stage.id,
          currentDiscussionId,
        );
      } catch (error) {
        console.log(error);
      }
      this.readyToEndDiscussionLoading = false;
    };

    const isDisabled =
      this.participantService.disableStage ||
      this.participantService.isReadyToEndChatDiscussion(
        this.stage.id,
        currentDiscussionId,
      );

    const sendAlert = async () => {
      this.isAlertLoading = true;
      await this.participantService.sendAlertMessage('Stuck in chat stage!');
      this.isAlertLoading = false;
    };

    return html`
      <pr-tooltip
        text=${isDisabled
          ? 'You can move on once others are also ready to move on.'
          : ''}
        position="TOP_END"
      >
        <pr-button
          color="tertiary"
          variant="tonal"
          ?disabled=${this.authService.isExperimenter ? false : isDisabled}
          ?loading=${this.readyToEndDiscussionLoading}
          @click=${onClick}
        >
          Ready to end discussion
        </pr-button>
      </pr-tooltip>
      <pr-tooltip
        position="TOP_END"
        text="Click this to alert the experimenter if you have trouble ending discussion"
      >
        <pr-icon-button
          icon="contact_support"
          variant="default"
          color="error"
          ?loading=${this.isAlertLoading}
          @click=${sendAlert}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  override render() {
    if (!this.stage) return nothing;
    const currentDiscussionId = this.cohortService.getChatDiscussionId(
      this.stage.id,
    );

    const renderProgress = () => {
      if (currentDiscussionId) {
        return html`
          <progress-chat-discussion-completed
            .discussionId=${currentDiscussionId}
          >
          </progress-chat-discussion-completed>
        `;
      }
      return html`<progress-stage-completed></progress-stage-completed>`;
    };

    return html`
      <div class="chat-content">
        ${this.cohortService.isChatLoading
          ? html`<div>Loading...</div>`
          : this.renderChatHistory(currentDiscussionId)}
      </div>
      <div class="input-row-wrapper">
        <div class="input-row">${this.renderInput()}</div>
      </div>
      <stage-footer .showNextButton=${currentDiscussionId === null}>
        ${renderProgress()}
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
