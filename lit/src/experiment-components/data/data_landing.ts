import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth_service';
import {DataService} from '../../services/data_service';

import {styles} from './data_landing.scss';

/** Data analysis landing page */
@customElement('data-landing')
export class Data extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly dataService = core.getService(DataService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>403: Participants cannot access this page</div>`;
    }

    // Update data for current route
    this.dataService.updateForCurrentRoute();

    return html`
      ${this.dataService.groupId ? html`<div>Group: ${this.dataService.groupId}</div>` : nothing}
      ${this.dataService.experimentId ? html`<div>Experiment: ${this.dataService.experimentId}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-landing': Data;
  }
}
