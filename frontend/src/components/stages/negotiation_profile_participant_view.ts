import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {
  NegotiationProfileStageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './info_view.scss';

/** Negotiation profile stage view for participants. */
@customElement('negotiation-profile-participant-view')
export class NegotiationProfileView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: NegotiationProfileStageConfig | null = null;
  @state() private isAssigning = false;

  override updated() {
    if (!this.stage) return;
    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.NEGOTIATION_PROFILE) return;
    const itemId =
      publicData.participantMap[
        this.participantService.profile?.publicId ?? ''
      ];
    if (!itemId && !this.isAssigning) {
      this.isAssigning = true;
      this.participantService.setParticipantNegotiationProfiles(this.stage.id);
    }
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.NEGOTIATION_PROFILE) {
      return nothing;
    }

    const itemId =
      publicData.participantMap[
        this.participantService.profile?.publicId ?? ''
      ];
    const item = this.stage.items.find((item) => item.id === itemId);

    const getProfile = () => {
      this.participantService.setParticipantNegotiationProfiles(
        this.stage?.id ?? '',
      );
    };

    const renderDisplay = () => {
      if (!item) return nothing;
      const lines = [
        `### Your Assigned Negotiation Profile: **${item.name}**`,
        ...item.displayLines,
      ];
      return html` ${unsafeHTML(convertMarkdownToHTML(lines.join('\n\n')))} `;
    };

    const renderButton = () => {
      if (this.isAssigning) {
        return html`<div>Assigning your negotiation profile...</div>`;
      }
      return html`
        <pr-button @click=${getProfile}>Get my negotiation profile</pr-button>
      `;
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="html-wrapper">
        <div class="info-block">${item ? renderDisplay() : renderButton()}</div>
      </div>
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
    'negotiation-profile-view': NegotiationProfileView;
  }
}
