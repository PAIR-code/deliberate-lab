import './participant_nav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';

import {
  StageKind
} from '@deliberation-lab/utils';

import {styles} from './participant_previewer.scss';

/** Participant's view of experiment */
@customElement('participant-previewer')
export class ParticipantPreviewer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  connectedCallback() {
    super.connectedCallback();
    this.experimentService.updateForCurrentRoute();
  }

  override render() {
    return html`
      <participant-nav></participant-nav>
      <div class="participant-previewer">
        <div class="header">
          ${this.experimentService.experimentName}
        </div>
        <div class="content"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-previewer': ParticipantPreviewer;
  }
}
