import '../stages/stage_description';
import '../stages/stage_footer';
import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ProfileType, ProfileStageConfig} from '@deliberation-lab/utils';
import {styles} from './profile_participant_view.scss';

/** Viewer for participants to see their profile. */
@customElement('profile-participant-view')
export class ProfileViewer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ProfileStageConfig | null = null;

  override render() {
    const profile = this.participantService.profile;
    if (!profile || !this.stage) return nothing;

    const info =
      this.stage.profileType === ProfileType.ANONYMOUS_ANIMAL ||
      this.stage.profileType === ProfileType.ANONYMOUS_PARTICIPANT
        ? 'You will be playing as this randomly generated identity:'
        : 'This is your specified profile:';

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="html-wrapper">
        <div>${info}</div>
        <div class="profile-wrapper">
          <participant-profile-display
            .profile=${profile}
            .stageId=${this.stage.id}
            displayType="stage"
          >
          </participant-profile-display>
        </div>
      </div>
      <stage-footer></stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-participant-view': ProfileViewer;
  }
}
