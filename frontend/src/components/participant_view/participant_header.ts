import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/info_popup';
import '../../pair-components/tooltip';

import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';

import {ParticipantProfile, StageConfig} from '@deliberation-lab/utils';
import {styles} from './participant_header.scss';

/** Header component for participant preview */
@customElement('participant-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: StageConfig | undefined = undefined;
  @property() profile: ParticipantProfile | undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="header">
        <div class="left">
          ${this.renderMenu()} ${this.stage.name}${this.renderInfo()}
        </div>
        <div class="right">
          ${this.renderHelpPanelToggle()} ${this.renderProfile()}
        </div>
      </div>
    `;
  }

  private renderMenu() {
    return html`
      <pr-icon-button
        class="menu-button"
        icon="menu"
        color="neutral"
        variant="default"
        @click=${() =>
          this.participantService.setShowParticipantSidenav(
            !this.participantService.showParticipantSidenav,
          )}
      >
      </pr-icon-button>
    `;
  }

  private renderProfile() {
    if (!this.profile) return nothing;
    return html`
      <pr-tooltip
        text="You are participating as this avatar"
        position="BOTTOM_END"
      >
        <participant-profile-display
          .profile=${this.profile}
          .stageId=${this.stage?.id ?? ''}
        >
        </participant-profile-display>
      </pr-tooltip>
    `;
  }

  private renderInfo() {
    if (!this.stage || this.stage.descriptions.infoText.length === 0) {
      return nothing;
    }
    return html`
      <info-popup .popupText=${this.stage.descriptions.infoText}></info-popup>
    `;
  }

  private renderHelpPanelToggle() {
    return html`
      <pr-tooltip
        text=" Click to message the administrator"
        position="BOTTOM_END"
      >
        <pr-icon-button
          icon="live_help"
          color="error"
          size="large"
          variant="default"
          @click=${() => {
            const current = this.participantService.getShowHelpPanel();
            this.participantService.setShowHelpPanel(!current);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-header': Header;
  }
}
