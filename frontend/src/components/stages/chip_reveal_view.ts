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

    return html`
      ${renderTitle()} ${this.renderGlobalTable(participants)}
      <div class="divider"></div>
      ${this.renderParticipantValuesTable()}
      <div class="divider"></div>
    `;
  }

  private makeCell(content: string) {
    return html`<div class="table-cell">${content}</div>`;
  }

  private renderGlobalTableHeader() {
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

    const renderChip = (chip: ChipItem, isCurrentUser: boolean) => {
      const participantChipMap =
        this.publicData?.participantChipMap[participant.publicId] ?? {};

      const cellContent = participantChipMap[chip.id]?.toString() ?? '';
      return this.makeCell(cellContent);
    };

    let participantIndicator = `${participant.avatar} ${getParticipantName(
      participant
    )}`;
    if (isCurrentUser) {
      participantIndicator += ' (you)';
    }

    return html`
      <div class="table-row">
        ${this.makeCell(participantIndicator)}
        ${this.stage?.chips.map((chip) => renderChip(chip, isCurrentUser))}
      </div>
    `;
  }

  private renderGlobalTable(participants: ParticipantProfile[]) {
    return html`
      <h3>Chip Counts</h3>
      <p class="description">
        This table shows how many chips all participants currently have.
      </p>
      <div class="table">
        ${this.renderGlobalTableHeader()}
        <div class="table-body">
          ${participants
            .filter((p) => isActiveParticipant(p))
            .sort((a, b) => {
              const isCurrentUserA =
                a.publicId === this.participantService.profile!.publicId;
              const isCurrentUserB =
                b.publicId === this.participantService.profile!.publicId;

              if (isCurrentUserA && !isCurrentUserB) {
                return -1;
              } else if (!isCurrentUserA && isCurrentUserB) {
                return 1;
              }
              return 0;
            })
            .map((p) => this.renderParticipantRow(p))}
        </div>
      </div>
    `;
  }

  private renderParticipantValuesTable() {
    const currentParticipant = this.participantService.profile;
    if (!this.publicData || !currentParticipant) return nothing;

    const participantChipMap =
      this.publicData?.participantChipMap[currentParticipant.publicId] ?? {};
    const participantChipValueMap =
      this.publicData?.participantChipValueMap[currentParticipant.publicId] ??
      {};

    // Get chip values for the current participant
    const chipValues = this.stage?.chips.map((chip) => {
      const quantity = participantChipMap[chip.id] ?? 0;
      const value = participantChipValueMap[chip.id] ?? 0;
      return {chip, quantity, value};
    });

    const totalPayout = chipValues
      ?.reduce((total, {quantity, value}) => total + quantity * value, 0)
      .toFixed(2);

    return html`
      <h3>Current Payout</h3>
      <p class="description">This table shows how much your chips are currently worth.</div>
      <div class="table">
        <div class="table-head">
          <div class="table-row">
            ${this.makeCell('Chip')} ${this.makeCell('Payout')}
          </div>
        </div>
        ${chipValues?.map(
          ({chip, quantity, value}) =>
            html`
              <div class="table-row">
                ${this.makeCell(chip.name)}
                ${this.makeCell(
                  `$${(quantity * value).toFixed(
                    2
                  )} (${quantity} chips x $${value})`
                )}
              </div>
            `
        )}
        <div class="table-foot">
        <div class="table-row">
          ${this.makeCell('Total payout')} ${this.makeCell(`$${totalPayout}`)}
        </div>
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
