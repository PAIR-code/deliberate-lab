import '../../pair-components/tooltip';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';

import {
  ChatStageConfig,
  MediatorConfig,
  ParticipantProfile,
} from '@deliberation-lab/utils';
import {isActiveParticipant} from '../../shared/participant.utils';

import {styles} from './chat_panel.scss';

/** Chat panel view with stage info, participants. */
@customElement('chat-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);

  @property() stage: ChatStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      ${this.renderParticipantList()} ${this.renderMediatorsList()}
    `;
  }

  private renderMediatorsList() {
    if (!this.authService.isDebugMode || !this.stage) {
      return;
    }

    const mediators = this.stage.mediators;
    if (!mediators) return;

    return html`
      <div class="panel-item">
        <div class="panel-item-title">Agents (${mediators.length})</div>
        <div class="panel-item-subtitle">Only visible to experimenters</div>
        ${mediators.map((mediator) => this.renderMediator(mediator))}
      </div>
    `;
  }

  private renderParticipantList() {
    const activeParticipants = this.cohortService.activeParticipants;
    return html`
      <div class="panel-item">
        <div class="panel-item-title">
          Participants (${activeParticipants.length})
        </div>
        ${activeParticipants.map((participant) =>
          this.renderProfile(participant)
        )}
      </div>
    `;
  }

  private renderMediator(mediator: MediatorConfig) {
    return html`
      <pr-tooltip text=${mediator.prompt} position="BOTTOM_END">
        <div class="profile">
          <profile-avatar .emoji=${mediator.avatar}></profile-avatar>
          <div class="name">${mediator.name}</div>
        </div>
      </pr-tooltip>
    `;
  }

  private renderProfile(profile: ParticipantProfile) {
    return html`
      <div class="profile">
        <profile-avatar
          .emoji=${profile.avatar}
          ?disabled=${isActiveParticipant(profile)}
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
