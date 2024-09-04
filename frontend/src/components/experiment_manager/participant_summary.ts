import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  ParticipantProfileExtended
} from '@deliberation-lab/utils';

import {styles} from './participant_summary.scss';

/** Participant summary for experimenters. */
@customElement('participant-summary')
export class ParticipantSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  @property() participant: ParticipantProfileExtended|undefined = undefined;

  override render() {
    if (this.participant === undefined) {
      return nothing;
    }

    const setCurrentParticipant = () => {
      if (!this.participant) return;
      this.experimentManager.setCurrentParticipantId(this.participant.privateId);
    };

    const classes = classMap({
      'participant-summary': true,
      'selected': this.experimentManager.currentParticipantId === this.participant.privateId
    });

    return html`
      <div class=${classes} @click=${setCurrentParticipant}>
        ${this.participant.publicId}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-summary': ParticipantSummary;
  }
}
