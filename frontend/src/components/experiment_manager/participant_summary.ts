import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind
} from '@deliberation-lab/utils';

import {
  getParticipantName,
  isObsoleteParticipant,
  isPendingParticipant
} from '../../shared/participant.utils';

import {styles} from './participant_summary.scss';

/** Participant summary for experimenters. */
@customElement('participant-summary')
export class ParticipantSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() participant: ParticipantProfileExtended|undefined = undefined;

  override render() {
    if (this.participant === undefined) {
      return nothing;
    }

    const setCurrentParticipant = () => {
      if (!this.participant) return;
      this.experimentManager.setCurrentParticipantId(this.participant.privateId);
    };

    const classes = classMap({
      'participant-summary': true,
      'selected': this.experimentManager.currentParticipantId === this.participant.privateId,
      'old': isObsoleteParticipant(this.participant)
    });

    return html`
      <div class=${classes} @click=${setCurrentParticipant}>
        <div class="left">
          <profile-avatar .emoji=${this.participant.avatar} .small=${true}>
          </profile-avatar>
          <div>${getParticipantName(this.participant)}</div>
          ${this.renderStatus()}
        </div>
        <div class="buttons">
          ${this.renderCopyButton()}
          ${this.renderPreviewButton()}
        </div>
      </div>
    `;
  }

  private renderStatus() {
    if (!this.participant) return nothing;

    if (isPendingParticipant(this.participant)) {
      return html`<div class="chip secondary">transfer pending</div>`;
    } else if (isObsoleteParticipant(this.participant)) {
      return html`<div class="chip">${this.participant.currentStatus}</div>`;
    }

    // If in transfer stage, return "ready for transfer" chip
    const stage = this.experimentService.getStage(this.participant.currentStageId);
    if (!stage) return nothing;
    if (stage.kind === StageKind.TRANSFER) {
      return html`<div class="chip tertiary">ready for transfer!</div>`;
    }

    return nothing;
  }

  async copyParticipantLink() {
    if (!this.participant) return;

    const basePath = window.location.href.substring(
      0,
      window.location.href.indexOf('/#')
    );
    const link = `${basePath}/#/e/${this.experimentManager.experimentId}/p/${this.participant.privateId}`;

    await navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  }

  private renderPreviewButton() {
    const navigate = () => {
      if (!this.participant) return;
      this.routerService.navigate(Pages.PARTICIPANT, {
        experiment: this.experimentManager.experimentId ?? '',
        participant: this.participant?.privateId
      })
    };

    return html`
      <pr-tooltip text="Preview as participant" position="BOTTOM_END">
        <pr-icon-button
          icon="slideshow"
          color="neutral"
          variant="default"
          ?disabled=${!this.participant}
          @click=${navigate}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderCopyButton() {
    return html`
      <pr-tooltip text="Copy experiment link" position="BOTTOM_END">
        <pr-icon-button
          icon="content_copy"
          color="neutral"
          variant="default"
          ?disabled=${!this.participant}
          @click=${this.copyParticipantLink}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-summary': ParticipantSummary;
  }
}
