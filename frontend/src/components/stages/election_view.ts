import '../../pair-components/icon_button';

import './stage_description';
import './stage_footer';
import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {
  ParticipantProfile,
  ElectionStageParticipantAnswer,
  ElectionStageConfig,
} from '@deliberation-lab/utils';
import {convertMarkdownToHTML} from '../../shared/utils';
import {isObsoleteParticipant} from '../../shared/participant.utils';

import {styles} from './election_view.scss';

/** Election view */
@customElement('election-view')
export class ElectionView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() stage: ElectionStageConfig|undefined = undefined;
  @property() answer: ElectionStageParticipantAnswer|undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    // Must rank all participants except self
    // TODO: Don't show obsolete participants if they never interacted
    // (e.g., during group chat)
    const disabled = (this.answer?.rankingList ?? []).length < this.cohortService.getAllParticipants().length - 1;

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="election-wrapper">
        ${this.renderStartZone()} ${this.renderEndZone()}
      </div>
      <stage-footer .disabled=${disabled}>
      </stage-footer>
    `;
  }

  private renderStartZone() {
    return html`
      <div class="start-zone">
        ${this.cohortService
          .getAllParticipants()
          .sort((p1, p2) => p1.publicId.localeCompare(p2.publicId))
          .filter(
            (profile) =>
              !(this.answer?.rankingList ?? []).find(
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

    return html`
      <div class="participant">
        <profile-avatar
          .emoji=${profile.avatar}
          .square=${true}
        >
        </profile-avatar>
        <div class="right">
          <div class="title">${profile.name}</div>
          <div class="subtitle">(${profile.pronouns})</div>
        </div>
      </div>
    `;
  }

  private renderDraggableParticipant(profile: ParticipantProfile) {
    if (profile.publicId === this.participantService.profile?.publicId) {
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
      if (target && event.dataTransfer && this.stage) {
        event.preventDefault();
        target.classList.remove('drag-over');

        const currentRankings = this.answer?.rankingList ?? [];
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
        // Update ranking list
        this.participantService.updateElectionStageParticipantAnswer(
          this.stage.id, rankings
        );
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
    // If current participant
    if (profile.publicId === this.participantService.profile?.publicId) {
      return nothing;
    }

    const onCancel = () => {
      const rankings = this.answer?.rankingList ?? [];
      const index = rankings.findIndex((id) => id === profile.publicId);

      if (index === -1 || !this.stage) {
        return;
      }

      this.participantService.updateElectionStageParticipantAnswer(
        this.stage.id,
        [...rankings.slice(0, index), ...rankings.slice(index + 1)],
      );
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
        draggable=${!this.participantService.disableStage}
        .ondragstart=${onDragStart}
        .ondragend=${onDragEnd}
      >
        ${this.renderParticipant(profile)}
        <pr-icon-button
          icon="close"
          color="neutral"
          variant="default"
          ?disabled=${this.participantService.disableStage}
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
          <div class="title">Rankings</div>
          <div class="subtitle">
            Drag and drop to rank participants (with most preferred at top)
          </div>
        </div>
        ${this.answer?.rankingList.map((publicId: string, index: number) => {
          const participant = this.cohortService
            .getAllParticipants()
            .find((profile) => profile.publicId === publicId);

          return participant
            ? this.renderRankedParticipant(participant, index)
            : nothing;
        })}
        ${this.renderDragZone((this.answer?.rankingList ?? []).length, true)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'election-view': ElectionView;
  }
}