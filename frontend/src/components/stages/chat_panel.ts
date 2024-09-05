import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';

import {
  ChatStageConfig,
  ParticipantProfile,
} from '@deliberation-lab/utils';
import {styles} from './chat_panel.scss';

/** Chat panel view with stage info, participants. */
@customElement('chat-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);

  @property() stage: ChatStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      ${this.renderParticipantList()}
    `;
  }

  private renderParticipantList() {
    const validParticipants = this.cohortService.validParticipants;
    return html`
      <div class="panel-item">
        <div class="panel-item-title">
          Participants (${validParticipants.length})
        </div>
        ${validParticipants.map(
          participant => this.renderProfile(participant)
        )}
      </div>
    `;
  }

  private renderProfile(profile: ParticipantProfile) {
    return html`
      <div class="profile">
        <profile-avatar
          .emoji=${profile.avatar}
          ?disabled=${this.cohortService.isActiveParticipant(profile)}
        >
        </profile-avatar>
        <div class="name">
          ${profile.name ? profile.name : profile.publicId}
          ${profile.pronouns ? `(${profile.pronouns})` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
