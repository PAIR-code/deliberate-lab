import '../../pair-components/icon_button';

import './stage_description';
import './stage_footer';
import '../participant_profile/profile_display';
import '../progress/progress_stage_completed';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ParticipantProfile,
  ParticipantStatus,
  ItemRankingStage,
  RankingStageConfig,
  RankingItem,
  RankingType,
} from '@deliberation-lab/utils';
import {getCohortRankingItems} from '../../shared/cohort.utils';

import {styles} from './ranking_view.scss';

/** Ranking view for participants */
@customElement('ranking-participant-view')
export class RankingView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: RankingStageConfig | undefined = undefined;

  private getItems() {
    return this.stage
      ? getCohortRankingItems(
          this.cohortService.activeParticipants,
          this.participantService.profile?.publicId ?? '',
          this.stage,
        )
      : [];
  }

  private getItemId(item: ParticipantProfile | RankingItem) {
    if ('publicId' in item) {
      return (item as ParticipantProfile).publicId;
    } else {
      return (item as RankingItem).id;
    }
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const items = this.getItems();
    const disabled =
      this.participantAnswerService.getNumRankings(this.stage.id) <
      items.length;

    const saveRankings = async () => {
      if (!this.stage) return;
      // Write rankings to Firestore
      this.participantService.updateRankingStageParticipantAnswer(
        this.stage.id,
        this.participantAnswerService.getRankingList(this.stage.id),
      );
      await this.participantService.progressToNextStage();
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="ranking-wrapper">
        ${this.renderStartZone()} ${this.renderEndZone()}
      </div>
      <stage-footer .disabled=${disabled} .onNextClick=${saveRankings}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStartZone() {
    if (!this.stage) return;
    const rankingList = this.participantAnswerService.getRankingList(
      this.stage.id,
    );

    return html`
      <div class="start-zone">
        ${this.getItems()
          .slice()
          .sort((p1, p2) =>
            this.getItemId(p1).localeCompare(this.getItemId(p2)),
          )
          .filter((i) => !rankingList.find((id) => id === this.getItemId(i)))
          .map((i) => this.renderDraggableParticipant(i))}
      </div>
    `;
  }

  private renderItem(item: ParticipantProfile | RankingItem) {
    if ('publicId' in item) {
      // It's a ParticipantProfile
      return this.renderParticipant(item as ParticipantProfile);
    } else {
      // It's an RankingItem
      return this.renderRankingItem(item as RankingItem);
    }
  }

  private renderParticipant(profile: ParticipantProfile) {
    return html`
      <participant-profile-display .profile=${profile} displayType="stage">
      </participant-profile-display>
    `;
  }

  private renderRankingItem(item: RankingItem) {
    const renderImage = () => {
      if (item.imageId.length === 0) return nothing;

      return html`
        <div class="img-wrapper">
          <img src=${item.imageId} />
        </div>
      `;
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

  private renderDraggableParticipant(item: ParticipantProfile | RankingItem) {
    const items = (this.stage as ItemRankingStage).rankingItems ?? [];

    const onDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.getItemId(item));
      }
    };

    const onDragEnd = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      target.style.opacity = '';
    };

    const onAddToRanking = () => {
      if (!this.stage || !item) return;
      const rankings = [
        ...this.participantAnswerService.getRankingList(this.stage.id),
        this.getItemId(item),
      ];
      // Update ranking list
      this.participantAnswerService.updateRankingAnswer(
        this.stage.id,
        rankings,
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

    const items = (this.stage as ItemRankingStage).rankingItems ?? [];

    const onDrop = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      if (target && event.dataTransfer && this.stage) {
        event.preventDefault();
        target.classList.remove('drag-over');

        const currentRankings = this.participantAnswerService.getRankingList(
          this.stage.id,
        );
        const itemId = event.dataTransfer.getData('text/plain');

        // Create new rankings (using answerIndex to slot participant in)
        let rankings = [...currentRankings];

        const existingIndex = currentRankings.findIndex((id) => id === itemId);
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
        this.participantAnswerService.updateRankingAnswer(
          this.stage.id,
          rankings,
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

  private renderRankedItem(
    item: ParticipantProfile | RankingItem,
    index: number,
  ) {
    if (!this.stage) return;
    const rankings = this.participantAnswerService.getRankingList(
      this.stage.id,
    );
    const onCancel = () => {
      if (index === -1 || !this.stage) {
        return;
      }

      this.participantAnswerService.updateRankingAnswer(this.stage.id, [
        ...rankings.slice(0, index),
        ...rankings.slice(index + 1),
      ]);
    };
    const items = (this.stage as ItemRankingStage).rankingItems ?? [];

    const onMoveUp = () => {
      if (!this.stage) return;
      const rankingList = [
        ...rankings.slice(0, index - 1),
        ...rankings.slice(index, index + 1),
        ...rankings.slice(index - 1, index),
        ...rankings.slice(index + 1),
      ];
      this.participantAnswerService.updateRankingAnswer(
        this.stage.id,
        rankingList,
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
      this.participantAnswerService.updateRankingAnswer(
        this.stage.id,
        rankingList,
      );
    };

    const onDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      target.style.opacity = '.25';

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.getItemId(item));
      }
    };

    const onDragEnd = (event: DragEvent) => {
      const target = event.target as HTMLElement;
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
            ?disabled=${this.participantService.disableStage ||
            index === rankings.length - 1}
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
    if (!this.stage) return;
    const rankingList = this.participantAnswerService.getRankingList(
      this.stage.id,
    );

    return html`
      <div class="end-zone">
        <div class="zone-header">
          <div class="title">Rankings</div>
          <div class="subtitle">
            Either drag and drop or click and use the arrows to rank the items, placing your most preferred at the top.
          </div>
        </div>
        ${rankingList.map((id: string, index: number) => {
          const item = this.getItems().find(
            (item) => this.getItemId(item) === id,
          );

          return item ? this.renderRankedItem(item, index) : nothing;
        })}
        ${this.renderDragZone(rankingList.length, true)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ranking-participant-view': RankingView;
  }
}
