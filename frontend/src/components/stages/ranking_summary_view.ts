import '../participant_profile/profile_display';

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

/** Ranking summary view */
@customElement('ranking-summary-view')
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

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const rankingList = this.participantAnswerService.getRankingList(
      this.stage.id,
    );

    const items = this.getItems();

    return html`
      <ol>
        ${rankingList.map((id: string) => {
          const item = items.find((i) => this.getItemId(i) === id);
          return item
            ? html`<li>${this.renderItem(item)}</li>`
            : html`<li>Unknown Item</li>`; // Handle missing items gracefully
        })}
      </ol>
    `;
  }

  // TODO: Refactor so that helper functions aren't repeated
  // in both participant view and summary view

  private getItemId(item: ParticipantProfile | RankingItem) {
    if ('publicId' in item) {
      return (item as ParticipantProfile).publicId;
    } else {
      return (item as RankingItem).id;
    }
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
}

declare global {
  interface HTMLElementTagNameMap {
    'ranking-summary-view': RankingView;
  }
}
