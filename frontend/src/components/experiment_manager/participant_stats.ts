import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ParticipantProfileExtended,
  ParticipantProfile,
  StageKind,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {getCohortName} from '../../shared/cohort.utils';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';
import '../stages/payout_summary_view';
import '../stages/reveal_summary_view';
import '../stages/ranking_summary_view';
import '../stages/survey_summary_view';
import '../stages/survey_per_participant_summary_view';

import {styles} from './participant_stats.scss';

import {isUnlockedStage} from '../../shared/participant.utils';

/** Participant profile status/stats (for experiment manager) */
@customElement('participant-stats')
export class Preview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  public readonly experimentManager = core.getService(ExperimentManager);
  public readonly experimentService = core.getService(ExperimentService);

  public readonly participantService = core.getService(ParticipantService);
  public readonly participantAnswerService = core.getService(
    ParticipantAnswerService
  );

  @property() profile: ParticipantProfileExtended | undefined = undefined;

  private getStageName = (id: string) => {
    return this.experimentService.getStageName(id, true);
  };

  override render() {
    if (!this.profile) {
      return nothing;
    }

    // TODO: add toolbar for previewing, copying links, etc.
    // TODO: add progress bar
    // TODO: add completed stages
    // TODO: add current/past transfer log
    const getCohort = (id: string) => {
      const cohort = this.experimentManager.getCohort(id);
      return cohort ? getCohortName(cohort) : '';
    };

    return html`
      <div><b>Private ID:</b> ${this.profile.privateId}</div>
      <div><b>Public ID:</b> ${this.profile.publicId}</div>
      <div>
        <b>Profile:</b> ${getParticipantInlineDisplay(this.profile)}
        ${this.profile.pronouns ? `(${this.profile.pronouns})` : ''}
      </div>
      <div><b>Status:</b> ${this.profile.currentStatus}</div>
      <div>
        <b>Current stage:</b> ${this.getStageName(this.profile.currentStageId)}
      </div>
      <!--
      <div>
        <b>Current cohort:</b> ${getCohort(this.profile.currentCohortId)}
      </div>
      -->
      <div><b>Prolific ID:</b> ${this.profile.prolificId ?? 'NONE'}</div>
      ${this.profile.transferCohortId
        ? html`<div>
            <b>Pending transfer to cohort:</b> ${getCohort(
              this.profile.transferCohortId
            )}
          </div>`
        : nothing}
      ${this.renderTimestamp(
        'Started experiment',
        this.profile.timestamps.startExperiment
      )}
      ${this.renderTimestamp(
        'Ended experiment',
        this.profile.timestamps.endExperiment
      )}
      ${this.renderTimestamp(
        'Accepted TOS',
        this.profile.timestamps.acceptedTOS
      )}
      ${this.renderStageDatas()}
    `;
  }

  private renderStageDatas() {
    if (!this.profile) return;

    const renderStageData = (stageId: string) => {
      const stage = this.experimentService.getStage(stageId);
      if (!stage || !isUnlockedStage(this.profile as ParticipantProfile, stageId)) {
        return nothing;
      }

      let stageHtml;

      switch (stage.kind) {
        case StageKind.PAYOUT:
          stageHtml = html`
            <payout-summary-view .stage=${stage}></payout-summary-view>
          `;
          break;
        case StageKind.REVEAL:
          stageHtml = html`
            <reveal-summary-view .stage=${stage}></reveal-summary-view>
          `;
          break;
        case StageKind.RANKING:
          stageHtml = html`
            <ranking-summary-view .stage=${stage}></ranking-summary-view>
          `;
          break;
        case StageKind.SURVEY:
          stageHtml = html`
            <survey-summary-view .stage=${stage}></survey-summary-view>
          `;
          break;
        case StageKind.SURVEY_PER_PARTICIPANT:
          stageHtml = html`
            <survey-per-participant-summary-view .stage=${stage}>
            </survey-per-participant-summary-view>
          `;
          break;
        default:
          return nothing;
      }

      if (stageHtml) {
        return html`
          <div>
            <h4>${this.getStageName(stageId)}</h4>
            ${stageHtml}
          </div>
          <div class="divider"></div>
        `;
      }
    };

    const stages = this.experimentService.experiment?.stageIds ?? [];
    if (stages.length === 0) return nothing;
    return html`
      <h3>Stage responses</h3>
      ${stages.map(stageId => renderStageData(stageId))}
    `;
  }

  private renderTimestamp(label: string, value: UnifiedTimestamp | null) {
    if (value === null) {
      return;
    }
    return html`
      <div><b>${label}:</b> ${convertUnifiedTimestampToDate(value)}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-stats': Preview;
  }
}
