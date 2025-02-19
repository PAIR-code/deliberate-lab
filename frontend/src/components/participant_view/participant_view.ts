import '../popup/accept_transfer_popup';
import '../popup/attention_check_popup';
import '../popup/booted_popup';
import '../progress/progress_stage_waiting';
import '../stages/chat_interface';
import '../stages/chat_panel';
import '../stages/chip_participant_view';
import '../stages/comprehension_participant_view';
import '../stages/ranking_participant_view';
import '../stages/info_view';
import '../stages/payout_participant_view';
import '../stages/profile_participant_editor';
import '../stages/profile_participant_view';
import '../stages/reveal_participant_view';
import '../stages/salesperson_participant_view';
import '../stages/survey_view';
import '../stages/survey_per_participant_view';
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
  ProfileType,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {isParticipantEndedExperiment} from '../../shared/participant.utils';

import {styles} from './participant_view.scss';

/** Participant's view of experiment */
@customElement('participant-view')
export class ParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() isStartExperimentLoading = false;

  override render() {
    const stageId = this.participantService.currentStageViewId;
    const stage = this.experimentService.getStage(stageId ?? '');

    const renderContent = () => {
      // Render landing if stage ID is undefined
      if (!stageId) {
        return html` <div class="content">${this.renderLanding()}</div> `;
      }

      return html`
        <participant-header
          .stage=${stage}
          .profile=${this.participantService.profile}
        >
        </participant-header>
        ${this.renderStageContent(stage)}
      `;
    };

    return html`
      <participant-nav></participant-nav>
      <div
        class="participant-previewer ${!this.authService.isExperimenter
          ? 'full-view'
          : ''}"
      >
        ${renderContent()}
      </div>
      ${this.renderPopups()}
    `;
  }

  private renderPopups() {
    return html`
      ${this.renderTransferPopup()} ${this.renderAttentionPopup()}
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
        await this.participantService.startExperiment();
        this.isStartExperimentLoading = false;
      };

      return html`
        <pr-button
          ?loading=${this.isStartExperimentLoading}
          variant="tonal"
          @click=${onStartExperiment}
        >
          Click to begin experiment
        </pr-button>
      `;
    }

    // Otherwise, route to current stage
    this.participantService.setCurrentStageView(profile.currentStageId);
  }

  private renderAttentionPopup() {
    if (
      this.participantService.profile?.currentStatus !==
      ParticipantStatus.ATTENTION_CHECK
    ) {
      return nothing;
    }
    return html` <attention-check-popup> </attention-check-popup> `;
  }

  private renderBootedPopup() {
    const isExperimenter = this.authService.isExperimenter;
    if (
      isExperimenter ||
      this.participantService.profile?.currentStatus !==
        ParticipantStatus.BOOTED_OUT
    ) {
      return nothing;
    }
    return html`<booted-popup></booted-popup>`;
  }

  private renderTransferPopup() {
    if (
      this.participantService.profile?.currentStatus !==
      ParticipantStatus.TRANSFER_PENDING
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
    if (
      (!this.participantService.profile?.timestamps.startExperiment ||
        !this.participantService.canAccessStage(stage.id)) &&
      !this.authService.isExperimenter
    ) {
      // When clicked, this button routes to the participant "landing,"
      // which either shows the "start experiment" button (if relevant)
      // or routes to the current stage.
      return html`
        <div class="content">
          <div>Stage not available yet</div>
          <pr-button
            @click=${() => {
              this.participantService.setCurrentStageView(undefined);
            }}
          >
            Go to current stage
          </pr-button>
        </div>
      `;
    }

    const isWaiting = this.cohortService.isStageInWaitingPhase(stage.id);
    if (isWaiting && !this.authService.isExperimenter) {
      return html`<progress-stage-waiting></progress-stage-waiting>`;
    }

    const answer = this.participantService.getStageAnswer(stage.id);
    switch (stage.kind) {
      case StageKind.TOS:
        return html`<tos-view .stage=${stage}></tos-view>`;
      case StageKind.INFO:
        return html`<info-view .stage=${stage}></info-view>`;
      case StageKind.PROFILE:
        if (stage.profileType === ProfileType.ANONYMOUS_ANIMAL) {
          return html`
            <profile-participant-view .stage=${stage}>
            </profile-participant-view>
          `;
        }
        return html`
          <profile-participant-editor .stage=${stage}>
          </profile-participant-editor>
        `;
      case StageKind.CHAT:
        return html`
          <div class="content chat">
            <chat-panel .stage=${stage}></chat-panel>
            <chat-interface .stage=${stage}></chat-interface>
          </div>
        `;
      case StageKind.CHIP:
        return html`
          <chip-participant-view .stage=${stage} .answer=${answer}>
          </chip-participant-view>
        `;
      case StageKind.COMPREHENSION:
        return html`
          <comprehension-participant-view .stage=${stage}>
          </comprehension-participant-view>
        `;
      case StageKind.RANKING:
        return html`
          <ranking-participant-view .stage=${stage} .answer=${answer}>
          </ranking-participant-view>
        `;
      case StageKind.PAYOUT:
        return html`
          <payout-participant-view .stage=${stage} .answer=${answer}>
          </payout-participant-view>
        `;
      case StageKind.REVEAL:
        return html`
          <reveal-participant-view .stage=${stage}></reveal-participant-view>
        `;
      case StageKind.SALESPERSON:
        return html`
          <salesperson-participant-view .stage=${stage}>
          </salesperson-participant-view>
        `;
      case StageKind.SURVEY:
        return html`<survey-view .stage=${stage}></survey-view>`;
      case StageKind.SURVEY_PER_PARTICIPANT:
        return html`<survey-per-participant-view .stage=${stage}></survey-view>`;
      case StageKind.TRANSFER:
        return html`<transfer-view .stage=${stage}></transfer-view>`;
      default:
        return html`<div class="content">Stage not found</div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-view': ParticipantView;
  }
}
