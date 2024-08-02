import '../../pair-components/icon_button';

import '../footer/footer';
import '../profile/profile_avatar';
import '../progress/progress_stage_completed';
import '../progress/progress_stage_waiting';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  ParticipantProfile,
  VoteForLeaderStageAnswer,
} from '@llm-mediation-experiments/utils';

import {PARTICIPANT_COMPLETION_TYPE} from '@llm-mediation-experiments/utils';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {RouterService} from '../../services/router_service';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './election_preview.scss';

/** Election preview */
@customElement('election-preview')
export class ElectionPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() answer: VoteForLeaderStageAnswer | null = null;

  override render() {
    const currentStage = this.routerService.activeRoute.params['stage'];
    if (!currentStage) {
      return nothing;
    }

    const {ready, notReady} =
      this.experimentService.getParticipantsReadyForStage(currentStage);

    const description =
      this.experimentService.stageConfigMap[currentStage].description;

    const descriptionContent = description
      ? html`<div class="description">
          ${unsafeHTML(convertMarkdownToHTML(description))}
        </div>`
      : nothing;

    if (notReady.length > 0) {
      return html`
        ${descriptionContent}
        <progress-stage-waiting .stageId=${currentStage}>
        </progress-stage-waiting>
      `;
    }

    const numActiveProfiles = this.experimentService
      .getParticipantProfiles()
      .filter((profile) => !profile.completedExperiment).length;
    const disabled =
      (this.answer?.rankings ?? []).length < numActiveProfiles - 1;
    return html`
      ${descriptionContent}

      <div class="election-wrapper">
        ${this.renderStartZone()} ${this.renderEndZone()}
      </div>
      <stage-footer .disabled=${disabled}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderStartZone() {
    return html`
      <div class="start-zone">
        ${this.experimentService
          .getParticipantProfiles()
          .sort((p1, p2) => p1.publicId.localeCompare(p2.publicId))
          .filter(
            (profile) =>
              !(this.answer?.rankings ?? []).find(
                (id) => id === profile.publicId
              )
          )
          .map((profile) => this.renderDraggableParticipant(profile))}
      </div>
    `;
  }

  private renderParticipant(profile: ParticipantProfile) {
    if (profile.publicId === this.participantService.profile?.publicId) {
      return nothing;
    }

    const isDisabled =
      profile.completedExperiment &&
      profile.completionType !== PARTICIPANT_COMPLETION_TYPE.SUCCESS;

    return html`
      <div class="participant">
        <profile-avatar
          .emoji=${profile.avatarUrl}
          .square=${true}
          .disabled=${isDisabled}
        >
        </profile-avatar>
        <div class="right">
          <div class="title">${profile.name}</div>
          <div class="subtitle">(${profile.pronouns})</div>
          ${isDisabled
            ? html`<div class="subtitle error">
                Votes for this participant will not count.
              </div>`
            : ''}
        </div>
      </div>
    `;
  }

  private renderDraggableParticipant(profile: ParticipantProfile) {
    if (
      profile.publicId === this.participantService.profile?.publicId ||
      profile.completedExperiment
    ) {
      return nothing;
    }

    const onDragStart = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', profile.publicId);
      }
    };

    const onDragEnd = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '';
    };

    return html`
      <div
        class="draggable"
        draggable=${this.participantService.isCurrentStage()}
        .ondragstart=${onDragStart}
        .ondragend=${onDragEnd}
      >
        ${this.renderParticipant(profile)}
      </div>
    `;
  }

  private renderDragZone(index: number, fillSpace = false) {
    const onDragEnter = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      if (target && event.dataTransfer) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        target.classList.add('drag-over');
      }
    };

    const onDragLeave = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        target.classList.remove('drag-over');
      }
    };

    const onDrop = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      if (target && event.dataTransfer) {
        event.preventDefault();
        target.classList.remove('drag-over');

        const stageId = this.routerService.activeRoute.params['stage'];
        const currentRankings = this.answer?.rankings ?? [];
        const participantId = event.dataTransfer.getData('text/plain');

        // Create new rankings (using answerIndex to slot participant in)
        let rankings = [...currentRankings];

        const existingIndex = currentRankings.findIndex(
          (id) => id === participantId
        );
        let newIndex = index;

        if (existingIndex >= 0) {
          // Remove participant from current ranking spot
          rankings = [
            ...rankings.slice(0, existingIndex),
            ...rankings.slice(existingIndex + 1),
          ];
          if (existingIndex <= newIndex) {
            newIndex -= 1; // Adjust index because participant was removed
          }
        }
        rankings = [
          ...rankings.slice(0, newIndex),
          participantId,
          ...rankings.slice(newIndex),
        ];
        this.participantService.updateVoteForLeaderStage(stageId, rankings);
      }
    };

    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    return html`
      <div
        class="drag-zone ${fillSpace ? 'fill' : ''}"
        .ondragover=${onDragOver}
        .ondragenter=${onDragEnter}
        .ondragleave=${onDragLeave}
        .ondrop=${onDrop}
      ></div>
    `;
  }

  private renderRankedParticipant(profile: ParticipantProfile, index: number) {
    if (profile.publicId === this.participantService.profile?.publicId) {
      return nothing;
    }

    const onCancel = () => {
      const stageId = this.routerService.activeRoute.params['stage'];
      const rankings = this.answer?.rankings ?? [];
      const index = rankings.findIndex((id) => id === profile.publicId);

      this.participantService.updateVoteForLeaderStage(stageId, [
        ...rankings.slice(0, index),
        ...rankings.slice(index + 1),
      ]);
    };

    const onDragStart = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', profile.publicId);
      }
    };

    const onDragEnd = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '';
    };

    return html`
      ${this.renderDragZone(index)}
      <div
        class="ranked"
        draggable=${this.participantService.isCurrentStage()}
        .ondragstart=${onDragStart}
        .ondragend=${onDragEnd}
      >
        ${this.renderParticipant(profile)}
        <pr-icon-button
          icon="close"
          color="neutral"
          variant="default"
          ?disabled=${!this.participantService.isCurrentStage()}
          @click=${onCancel}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderEndZone() {
    return html`
      <div class="end-zone">
        <div class="zone-header">
          <div class="title">Leader rankings</div>
          <div class="subtitle">
            Drag and drop to rank participants (with most preferred at top)
          </div>
        </div>
        ${this.answer?.rankings.map((publicId: string, index: number) => {
          const participant = this.experimentService
            .getParticipantProfiles()
            .find((profile) => profile.publicId === publicId);

          return participant
            ? this.renderRankedParticipant(participant, index)
            : nothing;
        })}
        ${this.renderDragZone((this.answer?.rankings ?? []).length, true)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'election-preview': ElectionPreview;
  }
}
