import '../../pair-components/textarea';

import '../footer/footer';
import '../progress/progress_stage_completed';
import './profile_avatar';

import '@material/web/radio/radio.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant_service';

import {PROFILE_AVATARS} from '../../shared/constants';

import {styles} from './profile_config.scss';

/** Participant profile config */
@customElement('profile-config')
export class ProfileConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() customPronouns = '';

  override render() {
    const filled =
      this.participantService.profile?.name &&
      this.participantService.profile?.pronouns &&
      this.participantService.profile?.avatarUrl;

    return html`
      <div class="profile-wrapper">
        ${this.renderName()} ${this.renderPronouns()} ${this.renderAvatars()}
      </div>
      <stage-footer .disabled=${!filled}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderName() {
    const handleNameInput = (e: Event) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.participantService.updateProfile({name});
    };

    return html`
      <pr-textarea
        label="First name"
        placeholder="This may be visible to other participants"
        variant="outlined"
        .value=${this.participantService.profile?.name}
        ?disabled=${!this.participantService.isCurrentStage()}
        @input=${handleNameInput}
      >
      </pr-textarea>
    `;
  }

  private renderPronouns() {
    const handleCustomPronouns = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.customPronouns = value;
      if (isCustom()) {
        this.participantService.updateProfile({pronouns: value});
      }
    };

    const handlePronounsInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      switch (value) {
        case '1':
          this.participantService.updateProfile({pronouns: 'she/her'});
          return;
        case '2':
          this.participantService.updateProfile({pronouns: 'he/him'});
          return;
        case '3':
          this.participantService.updateProfile({pronouns: 'they/them'});
          return;
        default:
          this.participantService.updateProfile({
            pronouns: this.customPronouns,
          });
          return;
      }
    };

    const isMatch = (pronouns: string) => {
      return (
        this.participantService.profile?.pronouns?.toLowerCase() === pronouns
      );
    };

    const isCustom = () => {
      const pronouns = this.participantService.profile?.pronouns?.toLowerCase();
      if (
        pronouns === 'she/her' ||
        pronouns === 'he/him' ||
        pronouns === 'they/them'
      ) {
        return false;
      }
      return pronouns !== null;
    };

    return html`
      <div class="radio-question">
        <div class="title">Pronouns</div>
        <div class="radio-button">
          <md-radio
            id="she"
            name="group"
            value="1"
            aria-label="she/her"
            ?checked=${isMatch('she/her')}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handlePronounsInput}
          >
          </md-radio>
          <label for="she">she/her</label>
        </div>
        <div class="radio-button">
          <md-radio
            id="he"
            name="group"
            value="2"
            aria-label="he/him"
            ?checked=${isMatch('he/him')}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handlePronounsInput}
          >
          </md-radio>
          <label for="he">he/him</label>
        </div>
        <div class="radio-button">
          <md-radio
            id="they"
            name="group"
            value="3"
            aria-label="they/them"
            ?checked=${isMatch('they/them')}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handlePronounsInput}
          >
          </md-radio>
          <label for="they">they/them</label>
        </div>
        <div class="radio-button">
          <md-radio
            id="other"
            name="group"
            value="4"
            aria-label="other"
            ?checked=${isCustom()}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handlePronounsInput}
          >
          </md-radio>
          <pr-textarea
            variant="outlined"
            placeholder="Add pronouns"
            .value=${isCustom()
              ? this.participantService.profile?.pronouns
              : this.customPronouns}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handleCustomPronouns}
          >
          </pr-textarea>
        </div>
      </div>
    `;
  }

  private renderAvatars() {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatarUrl = PROFILE_AVATARS[value];

      this.participantService.updateProfile({avatarUrl});
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="avatar"
            value=${index}
            aria-label=${emoji}
            ?checked=${this.participantService.profile?.avatarUrl === emoji}
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${handleAvatarClick}
          >
          </md-radio>
          <profile-avatar .emoji=${emoji} .square=${true}></profile-avatar>
        </div>
      `;
    };

    return html`
      <div class="radio-question">
        <div class="title">Avatar</div>
        <div class="avatars-wrapper">
          ${PROFILE_AVATARS.map((avatar, index) =>
            renderAvatarRadio(avatar, index)
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-config': ProfileConfig;
  }
}
