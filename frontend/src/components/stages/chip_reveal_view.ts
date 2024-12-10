import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {getParticipantName} from '../../shared/participant.utils';

import {
  ChipItem,
  ChipRevealItem,
  ChipStagePublicData,
  ChipStageConfig,
  ParticipantProfile,
  RevealAudience,
  StageKind,
} from '@deliberation-lab/utils';
import {isActiveParticipant} from '../../shared/participant.utils';
import {styles} from './chip_reveal_view.scss';
import {SurveyAnswer} from '@deliberation-lab/utils';

/** Chip negotiation reveal view */
@customElement('chip-reveal-view')
export class ChipReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChipStageConfig | undefined = undefined;
  @property() publicData: ChipStagePublicData | undefined = undefined;

  // Use chip reveal item to determine whether or not to show
  // chip values
  @property() item: ChipRevealItem | undefined = undefined;

  @property() showTitle = false;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const renderTitle = () => {
      if (!this.showTitle) {
        return nothing;
      }
      return html`<h2>Results for <b>${this.stage?.name}</b> stage</h2>`;
    };

    const currentParticipant = this.participantService.profile;
    const participants =
      this.item?.revealAudience === RevealAudience.CURRENT_PARTICIPANT
        ? currentParticipant
          ? [currentParticipant]
          : []
        : this.cohortService.getAllParticipants();

    return html` ${renderTitle()} ${this.renderTable(participants)} `;
  }

  private makeCell(content: string) {
    return html`<div class="table-cell">${content}</div>`;
  }

  private renderTableHeader() {
    if (!this.stage) return nothing;

    return html`
      <div class="table-head">
        <div class="table-row">
          ${this.makeCell('participant')}
          ${this.stage.chips.map((chip) => this.makeCell(chip.name))}
        </div>
      </div>
    `;
  }

  private renderParticipantRow(participant: ParticipantProfile) {
    if (!this.publicData) return nothing;

    const isCurrentUser =
      participant.publicId! === this.participantService.profile!.publicId;

    const renderChip = (chip: ChipItem) => {
      const participantChipMap =
        this.publicData?.participantChipMap[participant.publicId] ?? {};
      return this.makeCell(participantChipMap[chip.id]?.toString() ?? '');
    };

    let participantIndicator = getParticipantName(participant);
    if (isCurrentUser) {
      participantIndicator += ' (you)';
    }

    return html`
      <div class="table-row ${isCurrentUser ? 'current-user-row' : ''}">
        ${this.makeCell(participantIndicator)}
        ${this.stage?.chips.map((chip) => renderChip(chip))}
      </div>
    `;
  }

  private renderTable(participants: ParticipantProfile[]) {
    return html`
      <h3>Player Chip Balance Table</h3>
      <div class="table">
        ${this.renderTableHeader()}
        <div class="table-body">
          ${participants
            .filter((p) => isActiveParticipant(p))
            .map((p) => this.renderParticipantRow(p))}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-reveal-view': ChipReveal;
  }
}
