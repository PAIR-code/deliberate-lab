import '../../pair-components/icon_button';

import './stage_description';
import './stage_footer';
import '../participant_profile/profile_avatar';
import '../progress/progress_stage_completed';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {FirebaseService} from '../../services/firebase.service';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {
  ParticipantProfile,
  ElectionStageParticipantAnswer,
  ElectionStageConfig,
  ElectionItem,
} from '@deliberation-lab/utils';
import {convertMarkdownToHTML} from '../../shared/utils';
import {
  getParticipantName,
  getParticipantPronouns,
  isObsoleteParticipant
} from '../../shared/participant.utils';

import {styles} from './election_view.scss';

/** Election view */
@customElement('election-view')
export class ElectionView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() stage: ElectionStageConfig|undefined = undefined;
  @property() answer: ElectionStageParticipantAnswer|undefined = undefined;

  private getItems() {
    if (this.stage?.isParticipantElection) {
      // TODO: Enable voting for self.
      return this.cohortService
        .getAllParticipants()
        .filter(profile => profile.publicId !== this.participantService.profile?.publicId) ?? [];
    } else {
      return this.stage?.electionItems ?? [];
    }
  }

  private getItemId(item: ParticipantProfile | ElectionItem) {
    if ('publicId' in item) {
      return (item as ParticipantProfile).publicId;
    } 
    else {
      return (item as ElectionItem).id;
    }
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    // Must rank all participants except self
    // TODO: Don't show obsolete participants if they never interacted
    // (e.g., during group chat)
    const items = this.getItems();
    const disabled = (this.answer?.rankingList ?? []).length < items.length;

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="election-wrapper">
        ${this.renderStartZone()} ${this.renderEndZone()}
      </div>
      <stage-footer .disabled=${disabled}>
        ${this.stage.progress.showParticipantProgress ?
          html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStartZone() {
    return html`
      <div class="start-zone">
        ${this.getItems().slice()
          .sort((p1, p2) => this.getItemId(p1).localeCompare(this.getItemId(p2)))
          .filter(
            (i) =>
              !(this.answer?.rankingList ?? []).find(
                (id) => id === this.getItemId(i)
              )
          )
          .map((i) => this.renderDraggableParticipant(i))}
      </div>
    `;
  }

  private renderItem(item: ParticipantProfile | ElectionItem) {
    if ('publicId' in item) {
      // It's a ParticipantProfile
      return this.renderParticipant(item as ParticipantProfile);
    } else {
      // It's an ElectionItem
      return this.renderElectionItem(item as ElectionItem);
    }
  }

  private renderParticipant(profile: ParticipantProfile) {
    return html`
      <div class="item">
        <profile-avatar
          .emoji=${profile.avatar}
          .square=${true}
        >
        </profile-avatar>
        <div class="right">
          <div class="title">${getParticipantName(profile)}</div>
          <div class="subtitle">${getParticipantPronouns(profile)}</div>
        </div>
      </div>
    `;
  }

  private renderElectionItem(item: ElectionItem) {
    const renderImage = () => {
      if (item.imageId.length === 0) return nothing;

      const image = document.createElement('img');
      this.firebaseService.setImage(image, item.imageId);

      return html`<div class="img-wrapper">${image}</div>`;
    };

    return html`
      <div class="item">
        ${renderImage()}
        <div class="right">
          <div class="title">${item.text}</div>
        </div>
      </div>
    `;
  }

  private renderDraggableParticipant(item: ParticipantProfile | ElectionItem) {
    const onDragStart = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.getItemId(item));
      }
    };

    const onDragEnd = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '';
    };

    const onAddToRanking = () => {
      if (!this.stage || !item) return;
      const rankings = [
        ...(this.answer?.rankingList ?? []),
        this.getItemId(item),
      ];
      // Update ranking list
      this.participantService.updateElectionStageParticipantAnswer(
        this.stage.id, rankings, this.stage.electionItems
      );
    };

    return html`
      <div
        class="draggable"
        draggable=${this.participantService.isCurrentStage()}
        .ondragstart=${onDragStart}
        .ondragend=${onDragEnd}
      >
        ${this.renderItem(item)}
        <pr-icon-button
          icon="playlist_add"
          color="neutral"
          variant="default"
          ?disabled=${this.participantService.disableStage}
          @click=${onAddToRanking}
        >
        </pr-icon-button>
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
        const itemId = event.dataTransfer.getData('text/plain');

        // Create new rankings (using answerIndex to slot participant in)
        let rankings = [...currentRankings];

        const existingIndex = currentRankings.findIndex(
          (id) => id === itemId
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
          itemId,
          ...rankings.slice(newIndex),
        ];
        // Update ranking list
        this.participantService.updateElectionStageParticipantAnswer(
          this.stage.id, rankings, this.stage.electionItems
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

  private renderRankedItem(item: ParticipantProfile | ElectionItem, index: number) {
    const rankings = this.answer?.rankingList ?? [];
    const onCancel = () => {
      if (index === -1 || !this.stage) {
        return;
      }

      this.participantService.updateElectionStageParticipantAnswer(
        this.stage.id,
        [...rankings.slice(0, index), ...rankings.slice(index + 1)],
        this.stage.electionItems
      );
    };

    const onMoveUp = () => {
      if (!this.stage) return;
      const rankingList = [
        ...rankings.slice(0, index - 1),
        ...rankings.slice(index, index + 1),
        ...rankings.slice(index - 1, index),
        ...rankings.slice(index + 1)
      ];
      this.participantService.updateElectionStageParticipantAnswer(
        this.stage.id,
        rankingList,
        this.stage.electionItems
      );
    };

    const onMoveDown = () => {
      if (!this.stage) return;
      const rankingList = [
        ...rankings.slice(0, index),
        ...rankings.slice(index + 1, index + 2),
        ...rankings.slice(index, index + 1),
        ...rankings.slice(index + 2),
      ];
      this.participantService.updateElectionStageParticipantAnswer(
        this.stage.id,
        rankingList,
        this.stage.electionItems
      );
    }

    const onDragStart = (event: DragEvent) => {
      let target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.getItemId(item));
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
        ${this.renderItem(item)}
        <div class="actions">
          <pr-icon-button
            icon="arrow_upward"
            color="neutral"
            variant="default"
            ?disabled=${this.participantService.disableStage || index === 0}
            @click=${onMoveUp}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="arrow_downward"
            color="neutral"
            variant="default"
            ?disabled=${this.participantService.disableStage || index === rankings.length - 1}
            @click=${onMoveDown}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            ?disabled=${this.participantService.disableStage}
            @click=${onCancel}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }

  private renderEndZone() {
    return html`
      <div class="end-zone">
        <div class="zone-header">
          <div class="title">Rankings</div>
          <div class="subtitle">
            Drag and drop to rank, placing your most preferred at the top.
          </div>
        </div>
        ${this.answer?.rankingList.map((id: string, index: number) => {
          const item = this.getItems()
            .find((item) => this.getItemId(item) === id);

          return item
            ? this.renderRankedItem(item, index)
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