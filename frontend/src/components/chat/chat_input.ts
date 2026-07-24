import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ParticipantService} from '../../services/participant.service';
import {ExperimentService} from '../../services/experiment.service';

import {StageKind} from '@deliberation-lab/utils';

import {styles} from './chat_input.scss';

/** Chat input component */
@customElement('chat-input')
export class ChatInputComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly experimentService = core.getService(ExperimentService);

  @property() stageId = '';
  @property() sendUserInput: (input: string) => void = async (
    input: string,
  ) => {
    if (!this.stageId || !input || input.trim() === '') return;
    await this.participantService.createChatMessage({
      message: input.trim(),
      replyTo: this.participantAnswerService.getChatReply(this.stageId),
    });
    this.participantAnswerService.updateChatInput(this.stageId, '');
    this.participantAnswerService.clearChatReply(this.stageId);
  };
  @property() storeUserInput: (input: string) => void = (input: string) => {
    if (!this.stageId) return;
    this.participantAnswerService.updateChatInput(this.stageId, input);
  };
  @property() getUserInput: () => string = () => {
    return this.participantAnswerService.getChatInput(this.stageId ?? '');
  };
  @property() isDisabled = false;
  @property() isLoading = false;
  @property() isTurnBased = false;
  @state() hasFocusedOnce = false;

  // In turn-based chat the input is disabled between turns. When it becomes
  // enabled again (this participant's turn), move the cursor into the box so
  // they can type immediately. Skip touch devices, where focusing would force
  // the on-screen keyboard up every turn, and use preventScroll so re-focusing
  // does not jump the chat layout if the participant has scrolled up.
  override updated(changedProperties: PropertyValues) {
    if (
      this.isTurnBased &&
      changedProperties.has('isDisabled') &&
      !this.isDisabled &&
      navigator.maxTouchPoints === 0
    ) {
      const prTextarea = this.renderRoot.querySelector('pr-textarea') as
        | (Element & {
            renderRoot?: ParentNode;
            updateComplete?: Promise<unknown>;
          })
        | null;
      // The child pr-textarea re-renders asynchronously, so at this point its
      // inner <textarea> still has the disabled attribute and focus() would be
      // a no-op. Wait for the child's update to commit (disabled cleared)
      // before focusing.
      void prTextarea?.updateComplete?.then(() => {
        const textarea = prTextarea?.renderRoot?.querySelector(
          '#textarea',
        ) as HTMLElement | null;
        textarea?.focus({preventScroll: true});
      });
    }
  }

  override render() {
    const sendInput = async () => {
      if (this.isLoading || this.isDisabled) return;
      this.isLoading = true;
      await this.sendUserInput(this.getUserInput());
      this.isLoading = false;
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendInput();
      }
    };

    const handleInput = (e: Event) => {
      if (!this.stageId) return;

      const value = (e.target as HTMLTextAreaElement).value;
      this.storeUserInput(value);
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Check if bot protection is enabled
      const botProtection =
        this.experimentService.experiment?.defaultCohortConfig?.botProtection ??
        false;
      if (botProtection) {
        e.preventDefault();
        return false;
      }
    };

    const shouldFocus = () => {
      if (this.hasFocusedOnce || this.isDisabled) return false;
      if (navigator.maxTouchPoints > 0) return false; // mobile
      this.hasFocusedOnce = true;
      return true;
    };

    const stage = this.experimentService.getStage(this.stageId);
    const isPrivateChat = stage?.kind === StageKind.PRIVATE_CHAT;
    const isObserver =
      !isPrivateChat && this.participantService.profile?.isObserver === true;
    const placeholderText = isObserver
      ? 'You are observing this discussion and cannot send messages.'
      : 'Send message';

    return html`
      <div class="chat-input">
        ${this.renderReplyBanner()}
        <div class="input ${this.isDisabled ? 'disabled' : ''}">
          <pr-textarea
            size="small"
            placeholder=${placeholderText}
            .value=${this.getUserInput()}
            ?focused=${shouldFocus()}
            ?disabled=${this.isDisabled}
            @keydown=${handleKeyDown}
            @input=${handleInput}
            @paste=${handlePaste}
          >
          </pr-textarea>
          <pr-tooltip
            text=${placeholderText}
            color="tertiary"
            variant="outlined"
            position="TOP_END"
          >
            <pr-icon-button
              icon="send"
              variant="tonal"
              ?disabled=${this.isDisabled}
              ?loading=${this.isLoading}
              @click=${sendInput}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }

  /** Show the message being replied to, with the option to cancel the reply. */
  private renderReplyBanner() {
    if (!this.stageId) return nothing;

    const reply = this.participantAnswerService.getChatReply(this.stageId);
    if (!reply) return nothing;

    return html`
      <div class="reply-banner">
        <div class="reply-preview">
          <div class="reply-author">
            Replying to ${reply.name.length > 0 ? reply.name : reply.senderId}
          </div>
          <div class="reply-text">
            ${reply.message.length > 0 ? reply.message : 'Attachment'}
          </div>
        </div>
        <pr-tooltip text="Cancel reply" position="TOP_END">
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            @click=${() =>
              this.participantAnswerService.clearChatReply(this.stageId)}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-input': ChatInputComponent;
  }
}
