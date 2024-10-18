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
  StageKind,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {getCohortName} from '../../shared/cohort.utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import '../stages/payout_view';
import '../stages/reveal_view';
import '../stages/ranking_view';
import '../stages/survey_view';

import {styles} from './profile_preview.scss';

/** ParticipantProfile preview (for experiment manager) */
@customElement('participant-profile-preview')
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

    this.participantService.updateForRoute(
      this.experimentService.experiment!.id!,
      this.experimentManager.currentParticipantId!
    );

    this.participantAnswerService.updateForRoute(
      this.experimentService.experiment!.id,
      this.experimentManager.currentParticipantId!
    );

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
        <b>Profile:</b> ${this.profile.avatar ?? ''} ${this.profile.name ?? ''}
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
      let stageHtml;

      switch (stage.kind) {
        case StageKind.PAYOUT:
          stageHtml = html`<payout-view
            .stage=${stage}
            .renderSummaryView=${true}
          ></payout-view>`;
          break;
        case StageKind.REVEAL:
          stageHtml = html`<reveal-view
            .stage=${stage}
            .renderSummaryView=${true}
          ></reveal-view>`;
          break;
        case StageKind.RANKING:
          stageHtml = html`<ranking-view
            .stage=${stage}
            .renderSummaryView=${true}
          ></ranking-view>`;
          break;
        case StageKind.SURVEY:
          stageHtml = html`<survey-view
            .stage=${stage}
            .renderSummaryView=${true}
          ></survey-view>`;
          break;
        default:
          return ''; // Return empty HTML if no match
      }

      if (stageHtml) {
        return html`<div>
            <h4>${this.getStageName(stageId)}</h4>
            ${stageHtml}
          </div>
          <div class="divider"></div>`;
      }
    };

    const stages = [];
    for (const stageId of Object.keys(
      this.profile.timestamps.completedStages
    )) {
      const stageHtml = renderStageData(stageId);
      if (stageHtml) {
        stages.push(stageHtml);
      }
    }

    return stages.length
      ? html`<h3>Stage responses</h3>
          ${stages}`
      : ``;
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
    'participant-profile-preview': Preview;
  }
}
