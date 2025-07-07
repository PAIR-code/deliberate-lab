import '../progress/progress_stage_completed';
import '../chat/chat_interface';
import '../chat/chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';

import {PrivateChatStageConfig} from '@deliberation-lab/utils';

import {styles} from './group_chat_participant_view.scss';

/** Private chat interface for participants */
@customElement('private-chat-participant-view')
export class PrivateChatView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PrivateChatStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    const chatMessages =
      this.participantService.privateChatMap[this.stage.id] ?? [];

    // Disable input if turn-taking is set and latest message
    // is from participant
    const isDisabledInput = () => {
      if (!this.stage?.isTurnBasedChat) {
        return false;
      }
      if (chatMessages.length === 0) {
        return false;
      }
      const publicId = this.participantService.profile?.publicId ?? '';
      return chatMessages[chatMessages.length - 1].senderId === publicId;
    };

    return html`
      <chat-interface .stage=${this.stage} .disableInput=${isDisabledInput()}>
        ${chatMessages.map(
          (message) => html`<chat-message .chat=${message}></chat-message`,
        )}
        ${isDisabledInput()
          ? html`<div>Waiting for a response...</div>`
          : nothing}
      </chat-interface>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'private-chat-participant-view': PrivateChatView;
  }
}
