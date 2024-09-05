import '../participant_profile/profile_editor';
import '../popup/accept_transfer_popup';
import '../stages/chat_interface';
import '../stages/chat_panel';
import '../stages/info_view';
import '../stages/survey_view';
import '../stages/tos_view';
import './participant_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
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

  private readonly cohortService = core.getService(CohortService);
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
      let isLoading = false;
      const onStartExperiment = async () => {
        isLoading = true;
        const startExperiment = Timestamp.now();
        const timestamps = {
          ...profile.timestamps,
          startExperiment
        };
        await this.participantService.updateProfile({timestamps});
        isLoading = false;
      };

      return html`
        <pr-button
          ?loading=${isLoading}
          variant="tonal" @click=${onStartExperiment}
        >
          Start experiment
        </pr-button>
      `;
    }

    // If experiment is over
    if (profile.currentStatus !== ParticipantStatus.IN_PROGRESS) {
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

    const answer = this.participantService.currentStageAnswer;
    switch (stage.kind) {
      case StageKind.TOS:
        return html`<tos-view .stage=${stage}></tos-view>`;
      case StageKind.INFO:
        return html`<info-view .stage=${stage}></info-view>`;
      case StageKind.PROFILE:
        return html`<profile-editor></profile-editor>`;
      case StageKind.CHAT:
        return html`
          <chat-panel .stage=${stage}></chat-panel>
          <chat-interface .stage=${stage}></chat-interface>
        `;
      case StageKind.SURVEY:
        return html`
          <survey-view .stage=${stage} .answer=${answer}></survey-view>
        `;
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
