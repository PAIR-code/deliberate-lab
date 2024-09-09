import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {
  ParticipantProfileExtended,
  UnifiedTimestamp
} from '@deliberation-lab/utils';
import {
  getCohortName
} from '../../shared/cohort.utils';
import {
  convertUnifiedTimestampToDate
} from '../../shared/utils';

import {styles} from './profile_preview.scss';

/** ParticipantProfile preview (for experiment manager) */
@customElement('participant-profile-preview')
export class Preview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  public readonly experimentManager = core.getService(ExperimentManager);
  public readonly experimentService = core.getService(ExperimentService);

  @property() profile: ParticipantProfileExtended|undefined = undefined;

  override render() {
    if (!this.profile) {
      return nothing;
    }

    // TODO: add toolbar for previewing, copying links, etc.
    // TODO: add progress bar
    // TODO: add completed stages
    // TODO: add current/past transfer log

    const getStageName = (id: string) => {
      return this.experimentService.getStageName(id, true);
    };

    const getCohort = (id: string) => {
      return getCohortName(this.experimentManager.getCohort(id));
    }

    return html`
      <div><b>Private ID:</b> ${this.profile.privateId}</div>
      <div><b>Public ID:</b> ${this.profile.publicId}</div>
      <div><b>Name:</b> ${this.profile.name}</div>
      <div><b>Pronouns:</b> ${this.profile.pronouns}</div>
      <div><b>Avatar:</b> ${this.profile.avatar}</div>
      <div><b>Status:</b> ${this.profile.currentStatus}</div>
      <div><b>Current stage:</b> ${getStageName(this.profile.currentStageId)}</div>
      <div><b>Current cohort:</b> ${getCohort(this.profile.currentCohortId)}</div>
      ${this.profile.transferCohortId ?
        html`<div><b>Pending transfer to cohort:</b> ${getCohort(this.profile.transferCohortId)}</div>`
        : nothing}
      ${this.renderTimestamp('Started experiment', this.profile.timestamps.startExperiment)}
      ${this.renderTimestamp('Ended experiment', this.profile.timestamps.endExperiment)}
      ${this.renderTimestamp('Accepted TOS', this.profile.timestamps.acceptedTOS)}
    `;
  }

  private renderTimestamp(label: string, value: UnifiedTimestamp|null) {
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
