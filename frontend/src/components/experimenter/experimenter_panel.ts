import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import './experimenter_manual_chat';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {RouterService} from '../../services/router.service';

import {StageKind} from '@deliberation-lab/utils';

import {styles} from './experimenter_panel.scss';

/** Experimenter panel component */
@customElement('experimenter-panel')
export class Panel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    // Check if chat stage
    const stageId = this.routerService.activeRoute.params['stage'];
    const stage = this.experimentService.getStage(stageId);

    if (stage?.kind !== StageKind.CHAT) {
      return nothing;
    }

    const togglePanel = () => {
      this.routerService.setExperimenterPanel(
        !this.routerService.isExperimenterPanelOpen
      );
    };

    const panelClasses = classMap({
      'panel-wrapper': true,
      closed: !this.routerService.isExperimenterPanelOpen,
    });

    const renderChatTitle = () => {
      if (this.routerService.isExperimenterPanelOpen) {
        return html`<div class="title">Manual chat</div>`;
      }
      return nothing;
    };

    const renderChatPanel = () => {
      if (this.routerService.isExperimenterPanelOpen) {
        return html`<experimenter-manual-chat></experimenter-manual-chat>`;
      }
      return nothing;      
    }

    // TODO: Add experimenter data (API key) editor to panel

    return html`
      <div class=${panelClasses}>
        <div class="top">
          <div class="header">
            <div class="button-wrapper">
              <pr-icon-button
                color="secondary"
                icon=${this.routerService.isExperimenterPanelOpen ? "chevron_right" : "chat"}
                size="medium"
                variant="default"
                @click=${togglePanel}
              >
              </pr-icon-button>
            </div>
            ${renderChatTitle()}
          </div>
        </div>
        <div class="bottom">
          ${renderChatPanel()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-panel': Panel;
  }
}
