import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '../progress/progress_chat_discussion_completed';
import '../progress/progress_stage_completed';
import '../chat/chat_interface';
import '../chat/chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatDiscussionType,
  ChatStagePublicData,
  ChatMessage,
  ChatStageConfig,
  DiscussionItem,
  StageKind,
  UserType,
  getTimeElapsed,
} from '@deliberation-lab/utils';

import {styles} from './group_chat_participant_view.scss';

/** Group chat interface for participants */
@customElement('group-chat-participant-view')
export class GroupChatView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChatStageConfig | undefined = undefined;
  @property() disableInput = false;
  @property() showInfo = false;
  @state() readyToEndDiscussionLoading = false;

  private renderChatMessage(chatMessage: ChatMessage) {
    // Turn-based chats show a "discussion has ended" banner (rendered by
    // chat-interface), so suppress the duplicate system message carrying that
    // exact text. Non-turn-based chats get no banner and keep the system
    // message as their end-of-discussion cue.
    if (
      chatMessage.type === UserType.SYSTEM &&
      chatMessage.message ===
        'The discussion has ended. Please proceed to the next stage.' &&
      this.stage?.isTurnBased &&
      this.isConversationOver()
    ) {
      return nothing;
    }
    return html`
      <chat-message
        .chat=${chatMessage}
        .stageId=${this.stage?.id ?? ''}
        .enableReactionsAndReplies=${this.stage?.enableReactionsAndReplies ??
        false}
      >
      </chat-message>
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
    if (stageData.discussionEndTimestamp) return true;
    // Honor the backend's effective cap (a per-mediator override replaces the
    // stage value), falling back to the stage value when none is published.
    const max =
      stageData.effectiveMaxNumberOfMessages ??
      (stage as ChatStageConfig).maxNumberOfMessages;
    if (max != null && this.cohortMessageCount() >= max) return true;
    return false;
  }

  /**
   * Total non-system, non-error messages sent in the cohort's public chat.
   * Used to enforce cohort-wide min/max message limits.
   */
  private cohortMessageCount(): number {
    const stageId = this.participantService.currentStageViewId ?? '';
    const messages = this.cohortService.chatMap[stageId] ?? [];
    return messages.filter((m) => m.type !== UserType.SYSTEM && !m.isError)
      .length;
  }

  private isMinimumMessagesMet() {
    if (!this.stage) return true;
    // Honor a per-mediator min override published by the backend, falling back
    // to the stage-level minimum when none is set.
    const stageData = this.cohortService.stagePublicDataMap[this.stage.id] as
      | ChatStagePublicData
      | undefined;
    const min =
      stageData?.effectiveMinNumberOfMessages ??
      this.stage.minNumberOfMessages ??
      0;
    return this.cohortMessageCount() >= min;
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
      // (if earlier experiment version without currentDiscussionId, show all)
      if (currentDiscussionId !== null && currentDiscussionId !== undefined) {
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

  private renderEndDiscussionButton(currentDiscussionId: string | null) {
    if (!this.stage || !currentDiscussionId) {
      return nothing;
    }

    const onClick = async () => {
      if (!this.stage || !this.isMinimumTimeMet) return;

      this.readyToEndDiscussionLoading = true;
      try {
        this.analyticsService.trackButtonClick(ButtonClick.DISCUSSION_END);
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
      ) ||
      !this.isMinimumTimeMet;

    return html`
      <pr-tooltip
        text=${!this.isMinimumTimeMet
          ? `You must stay in this chat for at least ${this.minutesRemainingUntilMinimum} more minute${this.minutesRemainingUntilMinimum !== 1 ? 's' : ''}.`
          : isDisabled
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
    `;
  }

  private renderStageDescription() {
    if (!this.stage) return nothing;

    return html`
      <stage-description .stage=${this.stage} noPadding> </stage-description>
    `;
  }

  private renderIndicators() {
    if (!this.stage) return nothing;

    // Check if all other participants have completed the stage
    const completed = this.cohortService.getStageCompletedParticipants(
      this.stage.id,
    );
    // If current user is not in completed list, check if everyone else is
    const isSelfCompleted = completed.find(
      (p) => p.publicId === this.participantService.profile?.publicId,
    );

    if (
      !isSelfCompleted &&
      completed.length >= this.cohortService.activeParticipants.length - 1 &&
      this.cohortService.activeParticipants.length > 1
    ) {
      return html`
        <div slot="indicators" class="description">
          <pr-icon icon="done_all"></pr-icon>
          All other participants have completed this stage.
        </div>
      `;
    }

    return nothing;
  }

  override render() {
    if (!this.stage) return nothing;
    const currentDiscussionId = this.cohortService.getChatDiscussionId(
      this.stage.id,
    );

    // Determine if Next Stage button should be disabled. Also block advance
    // while a quiz is pending (incl. the final quiz after the last message) so
    // the participant cannot skip past it.
    const disableNext =
      !this.isMinimumTimeMet ||
      !this.isMinimumMessagesMet() ||
      this.isQuizPending;

    const renderProgress = () => {
      if (!this.stage?.progress.showParticipantProgress) {
        return nothing;
      }

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
      <chat-interface
        .stage=${this.stage}
        .disableInput=${this.disableInput ||
        // Observers are strictly read-only inside chat rooms (cannot type/send messages)
        // but must retain interactive capabilities to complete surveys in other stages,
        // so this gating is applied component-specifically rather than globally.
        this.participantService.profile?.isObserver ||
        this.participantService.disableStage ||
        // Block the direct-participation human from typing while their quiz is
        // pending (observers are already read-only) so they answer before the
        // discussion resumes.
        this.isQuizPending ||
        this.isConversationOver()}
        showPanel
      >
        <div slot="mobile-description">${this.renderStageDescription()}</div>
        ${this.renderIndicators()}
        ${this.cohortService.isChatLoading
          ? html`<div>Loading...</div>`
          : this.renderChatHistory(currentDiscussionId)}
      </chat-interface>
      <stage-footer
        .showNextButton=${currentDiscussionId === null}
        .disabled=${disableNext}
      >
        ${renderProgress()}
        ${this.renderEndDiscussionButton(currentDiscussionId)}
      </stage-footer>
    `;
  }

  get isMinimumTimeMet() {
    if (!this.stage || !this.stage.timeMinimumInMinutes) return true;

    const publicStageData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as ChatStagePublicData;

    if (!publicStageData?.discussionStartTimestamp) {
      return false;
    }

    return (
      getTimeElapsed(publicStageData.discussionStartTimestamp, 'm') >=
      this.stage.timeMinimumInMinutes
    );
  }

  /** True while the participant has an unanswered quiz pending. The backend
   *  keeps quizPauseCheckpoint > 0 until they submit (and zeroes it on
   *  submit), so this single public-data flag is the authoritative "quiz
   *  unanswered" signal, including the final quiz that follows the last
   *  message. It is only ever set for a quiz, so ordinary chats are
   *  unaffected. Used to block stage advance until the quiz is submitted. */
  private get isQuizPending(): boolean {
    if (!this.stage) return false;
    const data = this.cohortService.stagePublicDataMap[this.stage.id] as
      | ChatStagePublicData
      | undefined;
    return (data?.quizPauseCheckpoint ?? 0) > 0;
  }

  get minutesRemainingUntilMinimum(): number {
    if (!this.stage?.timeMinimumInMinutes) return 0;

    const publicStageData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as ChatStagePublicData;

    if (!publicStageData?.discussionStartTimestamp) {
      return this.stage.timeMinimumInMinutes;
    }

    const elapsed = getTimeElapsed(
      publicStageData.discussionStartTimestamp,
      'm',
    );
    return Math.ceil(this.stage.timeMinimumInMinutes - elapsed);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-chat-participant-view': GroupChatView;
  }
}
