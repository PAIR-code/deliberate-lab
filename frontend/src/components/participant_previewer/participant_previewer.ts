import '../participant_profile/profile_editor';
import '../popup/accept_transfer_popup';
import '../stages/info_view';
import '../stages/tos_view';
import './participant_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  ParticipantStatus,
  StageConfig,
  StageKind
} from '@deliberation-lab/utils';

import {styles} from './participant_previewer.scss';

/** Participant's view of experiment */
@customElement('participant-previewer')
export class ParticipantPreviewer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  connectedCallback() {
    super.connectedCallback();
    this.experimentService.updateForCurrentRoute();
    this.participantService.updateForCurrentRoute();
  }

  override render() {
    if (this.routerService.activePage === Pages.PARTICIPANT) {
      return html`
        <participant-nav></participant-nav>
        <div class="participant-previewer">
          <div class="content">
            ${this.renderLanding()}
          </div>
        </div>
        ${this.renderTransferPopup()}
      `;
    }

    const stageId = this.routerService.activeRoute.params['stage'];
    return html`
      <participant-nav></participant-nav>
      <div class="participant-previewer">
        <div class="header">
          ${this.experimentService.getStageName(stageId)}
        </div>
        <div class="content">
          ${this.renderStageContent(this.experimentService.getStage(stageId))}
        </div>
      </div>
      ${this.renderTransferPopup()}
    `;
  }

  private renderLanding() {
    const profile = this.participantService.profile;
    if (!profile) {
      return nothing;
    }

    // If participant has not started experiment before
    if (!profile.timestamps.startExperiment) {
      const onStartExperiment = () => {
        const startExperiment = Timestamp.now();
        const timestamps = {
          ...profile.timestamps,
          startExperiment
        };
        this.participantService.updateProfile({timestamps});
      };

      return html`
        <pr-button variant="tonal" @click=${onStartExperiment}>
          Start experiment
        </pr-button>
      `;
    }

    // If experiment is over
    if (
      profile.currentStatus === ParticipantStatus.TRANSFER_FAILED
      || profile.currentStatus === ParticipantStatus.TRANSFER_DECLINED
      || profile.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT
      || profile.currentStatus === ParticipantStatus.BOOTED_OUT
    ) {
      return html`<div>The experiment has ended.</div>`;
    }

    // Otherwise, route to current stage
    this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
      experiment: this.routerService.activeRoute.params['experiment'],
      participant: this.routerService.activeRoute.params['participant'],
      stage: profile.currentStageId,
    });
  }

  private renderTransferPopup() {
    if (this.participantService.profile?.currentStatus
      !== ParticipantStatus.TRANSFER_PENDING
    ) {
      return nothing;
    }
    return html`<transfer-popup></transfer-popup>`;
  }

  private renderStageContent(stage: StageConfig) {
    if (!stage) {
      return nothing;
    }

    switch (stage.kind) {
      case StageKind.TOS:
        return html`<tos-view .stage=${stage}></tos-view>`;
      case StageKind.INFO:
        return html`<info-view .stage=${stage}></info-view>`;
      case StageKind.PROFILE:
        return html`<profile-editor></profile-editor>`;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-previewer': ParticipantPreviewer;
  }
}
