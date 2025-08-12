import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';

import {
  ChipItem,
  ChipRevealItem,
  ChipStagePublicData,
  ChipStageConfig,
  ParticipantProfile,
  RevealAudience,
  StageKind,
  sortParticipantsByRandomProfile,
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
        : this.cohortService.getAllParticipants(false); // Hide transfer pending.

    return html` ${renderTitle()} ${this.renderGlobalTable(participants)} `;
  }

  private makeCell(content: string) {
    return html`<div class="table-cell">${content}</div>`;
  }

  private renderGlobalTableHeader() {
    if (!this.stage) return nothing;

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
      <div class="table-head">
        <div class="table-row">
          <div class="table-cell participant-cell">
            Participants
            <div class="subtitle">(in turn order)</div>
          </div>
          ${chipValues.map(
            (chip) =>
              html`<div class="table-cell">
                <div>
                  ${chip.chip.avatar} ${chip.chip.name}
                  <div>
                    <div class="subtitle">
                      $${chip.value.toFixed(2)} for
                      ${chip.chip.upperValue === chip.chip.lowerValue
                        ? 'all'
                        : 'you'}
                    </div>
                  </div>
                </div>
              </div>`,
          )}
        </div>
      </div>
    `;
  }

  private renderParticipantRow(participant: ParticipantProfile) {
    if (!this.publicData) return nothing;

    const isCurrentUser =
      participant.publicId! === this.participantService.profile!.publicId;

    const isCurrentTurn = (participant: ParticipantProfile) => {
      if (this.publicData?.kind !== StageKind.CHIP) return false;

      return this.publicData.currentTurn === participant.publicId;
    };

    const renderChip = (chip: ChipItem, isCurrentUser: boolean) => {
      const participantChipMap =
        this.publicData?.participantChipMap[participant.publicId] ?? {};

      const cellContent = participantChipMap[chip.id]?.toString() ?? '';
      return this.makeCell(cellContent);
    };

    const participantIndicator = html`
      <span class="indicator ${isCurrentTurn(participant) ? '' : 'hidden'}">
        👉
      </span>
      ${getParticipantInlineDisplay(
        participant,
        isCurrentUser,
        this.stage?.id ?? '',
      )}
    `;

    return html`
      <div class="table-row ${isCurrentUser ? 'highlight' : ''}">
        <div class="table-cell participant-cell">${participantIndicator}</div>
        ${this.stage?.chips.map((chip) => renderChip(chip, isCurrentUser))}
      </div>
    `;
  }

  private renderGlobalTable(participants: ParticipantProfile[]) {
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

    // Calculate the initial payout as a sum
    const initialPayout = this.stage?.chips.reduce((sum, chip) => {
      const value = participantChipValueMap[chip.id] ?? 0;
      return sum + chip.startingQuantity * value;
    }, 0);

    const totalPayout = chipValues?.reduce(
      (total, {quantity, value}) => total + quantity * value,
      0,
    );

    const diff = totalPayout! - initialPayout!;
    const renderPayout = () => {
      if (diff < 0) {
        return html`
          $0.00
          <b class="negative">(${diff > 0 ? '+' : ''}${diff.toFixed(2)})</b>
        `;
      } else if (diff === 0) {
        return html`<b>$0.00</b>`;
      } else {
        return html`<b class="positive">$${diff.toFixed(2)}</b>`;
      }
    };

    return html`
      <div class="tables-wrapper">
        <div class="table">
          ${this.renderGlobalTableHeader()}
          <div class="table-body">
            ${sortParticipantsByRandomProfile(
              participants,
              this.stage?.id ?? '',
            ).map((p) => this.renderParticipantRow(p))}
          </div>
        </div>
        <div class="table">
          <div class="table-head">
            <div class="table-cell">Your estimated payout</div>
          </div>
          <div class="table-row">
            <div class="table-cell value-header">Initial chip value</div>
            ${this.makeCell(`$${initialPayout!.toFixed(2)}`)}
          </div>
          <div class="table-row">
            <div class="table-cell value-header">Current chip value</div>
            <div class="table-cell">$${totalPayout!.toFixed(2)}</div>
          </div>

          <div class="table-row">
            <div class="table-cell value-header">Current payout</div>
            <div class="table-cell">${renderPayout()}</div>
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
