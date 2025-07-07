import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '../chat/chat_input';
import '../participant_profile/avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ParticipantService} from '../../services/participant.service';

import {EXPERIMENTER_MANUAL_CHAT_SENDER_ID} from '@deliberation-lab/utils';
import {LLM_AGENT_AVATARS} from '../../shared/constants';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './experimenter_manual_chat.scss';

/** Experimenter manual chat interface component */
@customElement('experimenter-manual-chat')
export class Chat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly participantService = core.getService(ParticipantService);

  @state() value = '';
  @state() name = 'Moderator';
  @state() avatar = '🙋';
  @state() isLoading = false;

  private renderName() {
    const updateName = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.name = value;
    };

    return html`
      <div class="radio-question">
        <div class="title">Sender name</div>
        <pr-textarea
          placeholder="Name of sender"
          variant="outlined"
          .value=${this.name}
          ?disabled=${this.isLoading}
          @input=${updateName}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderAvatars() {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_AGENT_AVATARS[value];
      this.avatar = avatar;
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="manual-chat-avatar"
            value=${index}
            ?checked=${this.avatar === emoji}
            @change=${handleAvatarClick}
          >
          </md-radio>
          <avatar-icon
            .emoji=${emoji}
            .square=${true}
            .color=${getHashBasedColor(EXPERIMENTER_MANUAL_CHAT_SENDER_ID)}
          >
          </avatar-icon>
        </div>
      `;
    };

    return html`
      <div class="radio-question">
        <div class="title">Avatar</div>
        <div class="radio-wrapper">
          ${LLM_AGENT_AVATARS.map((avatar, index) =>
            renderAvatarRadio(avatar, index),
          )}
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.authService.isExperimenter) return nothing;

    const stageId = this.participantService.currentStageViewId ?? '';

    return html`
      ${this.renderName()} ${this.renderAvatars()}
      <chat-input
        .stageId=${stageId}
        .sendUserInput=${async (input: string) => {
          if (input.trim() === '') return;
          this.isLoading = true;
          // Send chat message
          await this.experimentManager.createManualChatMessage(
            this.participantService.currentStageViewId ?? '',
            {
              message: this.value.trim(),
              profile: {name: this.name, avatar: this.avatar, pronouns: null},
            },
          );
          this.value = '';
          this.isLoading = false;
        }}
        .storeUserInput=${(input: string) => {
          this.value = input;
        }}
        .getUserInput=${() => this.value}
      >
      </chat-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-manual-chat': Chat;
  }
}
