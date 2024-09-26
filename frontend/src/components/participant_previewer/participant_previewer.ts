import '../participant_profile/profile_editor';
import '../popup/accept_transfer_popup';
import '../popup/attention_check_popup';
import '../popup/booted_popup';
import '../progress/progress_stage_waiting';
import '../stages/chat_interface';
import '../stages/chat_panel';
import '../stages/election_view';
import '../stages/info_view';
import '../stages/payout_view';
import '../stages/reveal_view';
import '../stages/survey_view';
import '../stages/tos_view';
import '../stages/transfer_view';
import './participant_header';
import './participant_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  ParticipantStatus,
  StageConfig,
  StageKind
} from '@deliberation-lab/utils';
import {
  isParticipantEndedExperiment
} from '../../shared/participant.utils';

import {styles} from './participant_previewer.scss';

/** Participant's view of experiment */
@customElement('participant-previewer')
export class ParticipantPreviewer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() isStartExperimentLoading = false;

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

        ${this.renderPopups()}
      `;
    }

    const stageId = this.routerService.activeRoute.params['stage'];
    const stage = this.experimentService.getStage(stageId);

    return html`
      <participant-nav></participant-nav>
      <div class="participant-previewer">
        <participant-header .stage=${stage}></participant-header>
        ${this.renderStageContent(stage)}
      </div>
      ${this.renderPopups()}
    `;
  }

  private renderPopups() {
    return html`
    ${this.renderTransferPopup()}
    ${this.renderAttentionPopup()}
    ${this.renderBootedPopup()}
    `;
  }

  private renderLanding() {
    const profile = this.participantService.profile;
    if (!profile) {
      return nothing;
    }

    // If experiment is over
    if (isParticipantEndedExperiment(profile)) {
      return html`<div>The experiment has ended.</div>`;
    }

    // If participant has not started experiment before
    // TODO: If cohort requires min number of participants,
    // show loading screen before participants are allowed to start
    if (!profile.timestamps.startExperiment) {
      const onStartExperiment = async () => {
        this.isStartExperimentLoading = true;
        const startExperiment = Timestamp.now();
        const timestamps = {
          ...profile.timestamps,
          startExperiment
        };
        await this.participantService.updateProfile({timestamps});
        this.isStartExperimentLoading = false;
      };

      return html`
        <pr-button
          ?loading=${this.isStartExperimentLoading}
          variant="tonal" @click=${onStartExperiment}
        >
          Start experiment
        </pr-button>
      `;
    }

    // Otherwise, route to current stage
    this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
      experiment: this.routerService.activeRoute.params['experiment'],
      participant: this.routerService.activeRoute.params['participant'],
      stage: profile.currentStageId,
    });
  }

  private renderAttentionPopup() {
    const isObsolete = this.participantService.isObsoleteParticipant;
    const isExperimenter = this.authService.isExperimenter;
    const config = this.experimentService.experiment?.attentionCheckConfig;
    if (
      isObsolete || isExperimenter || !config || !config.enableAttentionChecks
    ) {
      return nothing;
    }
    return html`
      <attention-check-popup
        .waitSeconds=${config.waitSeconds}
        .popupSeconds=${config.popupSeconds}
      >
      </attention-check-popup>
    `;
  }

  private renderBootedPopup() {
    if (this.participantService.profile?.currentStatus
      !== ParticipantStatus.BOOTED_OUT
    ) {
      return nothing;
    }
    return html`<booted-popup></booted-popup>`;
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

    // If stage not yet unlocked, do not show to participants
    if (!this.participantService.canAccessStage(stage.id)
      && !this.authService.isExperimenter
    ) {
      return html`<div class="content">Stage not available yet</div>`;
    }

    const isWaiting = this.cohortService.isStageWaitingForParticipants(stage.id);
    const answer = this.participantService.getStageAnswer(stage.id);
    switch (stage.kind) {
      case StageKind.TOS:
        return html`<tos-view .stage=${stage}></tos-view>`;
      case StageKind.INFO:
        return html`<info-view .stage=${stage}></info-view>`;
      case StageKind.PROFILE:
        return html`<profile-editor></profile-editor>`;
      case StageKind.CHAT:
        if (isWaiting) {
          return html`<progress-stage-waiting></progress-stage-waiting>`;
        }
        return html`
          <div class="content chat">
            <chat-panel .stage=${stage}></chat-panel>
            <chat-interface .stage=${stage}></chat-interface>
          </div>
        `;
      case StageKind.ELECTION:
        if (isWaiting) {
          return html`<progress-stage-waiting></progress-stage-waiting>`;
        }
        return html`
          <election-view .stage=${stage} .answer=${answer}></election-view>
        `;
      case StageKind.PAYOUT:
        return html`<payout-view .stage=${stage}></payout-view>`;
      case StageKind.REVEAL:
        if (isWaiting) {
          return html`<progress-stage-waiting></progress-stage-waiting>`;
        }
        return html`<reveal-view .stage=${stage}></reveal-view>`;
      case StageKind.SURVEY:
        return html`
          <survey-view .stage=${stage} .answer=${answer}></survey-view>
        `;
      case StageKind.TRANSFER:
        return html`<transfer-view .stage=${stage}></transfer-view>`;
      default:
        return html`<div class="content">Stage not found</div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-previewer': ParticipantPreviewer;
  }
}
