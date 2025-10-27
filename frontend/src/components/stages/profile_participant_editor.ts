import '../../pair-components/textarea';

import '../progress/progress_stage_completed';
import '../stages/stage_description';
import '../stages/stage_footer';
import '../participant_profile/avatar_icon';
import '../avatar_picker/avatar_picker';

import '@material/web/radio/radio.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ProfileStageConfig, ProfileType} from '@deliberation-lab/utils';
import type {EmojiSelectedDetail} from '../avatar_picker/avatar_picker';
import {MAN_EMOJIS, WOMAN_EMOJIS, PERSON_EMOJIS} from '../../shared/constants';

import {styles} from './profile_participant_editor.scss';

/** Editor for participants to adjust their profile. */
@customElement('profile-participant-editor')
export class ProfileEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() stage: ProfileStageConfig | null = null;

  @property() customPronouns = '';

  override render() {
    if (!this.stage) return nothing;

    const filled = this.participantAnswerService.isProfileCompleted;

    const updateProfile = async () => {
      const profile = this.participantAnswerService.profile;
      if (profile) {
        this.participantService.updateParticipantProfile(profile);
      }
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="profile-wrapper">
        ${this.renderName()} ${this.renderPronouns()}
        ${this.stage.profileType === ProfileType.DEFAULT_GENDERED
          ? this.renderGenderedAvatars()
          : this.renderAvatars()}
      </div>
      <stage-footer .disabled=${!filled} .onNextClick=${updateProfile}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderName() {
    const handleNameInput = (e: Event) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.participantAnswerService.updateProfile({name});
    };

    return html`
      <pr-textarea
        label="First name"
        placeholder="This may be visible to other participants"
        variant="outlined"
        .value=${this.participantAnswerService.profile?.name ?? ''}
        ?disabled=${this.participantService.disableStage}
        @input=${handleNameInput}
      >
      </pr-textarea>
    `;
  }

  private renderPronouns() {
    const handleCustomPronouns = (e: Event) => {
      const pronouns = (e.target as HTMLTextAreaElement).value;
      this.customPronouns = pronouns;
      if (isCustom()) {
        this.participantAnswerService.updateProfile({pronouns});
      }
    };

    const handlePronounsInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      switch (value) {
        case '1':
          this.participantAnswerService.updateProfile({pronouns: 'she/her'});
          return;
        case '2':
          this.participantAnswerService.updateProfile({pronouns: 'he/him'});
          return;
        case '3':
          this.participantAnswerService.updateProfile({pronouns: 'they/them'});
          return;
        default:
          this.participantAnswerService.updateProfile({
            pronouns: this.customPronouns,
          });
          return;
      }
    };

    const isMatch = (pronouns: string) => {
      return (
        this.participantAnswerService.profile?.pronouns?.toLowerCase() ===
        pronouns
      );
    };

    const isCustom = () => {
      const pronouns =
        this.participantAnswerService.profile?.pronouns?.toLowerCase();
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
            ?disabled=${this.participantService.disableStage}
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
            ?disabled=${this.participantService.disableStage}
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
            ?disabled=${this.participantService.disableStage}
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
            ?disabled=${this.participantService.disableStage}
            @change=${handlePronounsInput}
          >
          </md-radio>
          <pr-textarea
            variant="outlined"
            placeholder="Add pronouns"
            .value=${isCustom()
              ? this.participantAnswerService.profile?.pronouns
              : this.customPronouns}
            ?disabled=${this.participantService.disableStage}
            @change=${handleCustomPronouns}
          >
          </pr-textarea>
        </div>
      </div>
    `;
  }

  private handleAvatarChange(event: CustomEvent<EmojiSelectedDetail>) {
    const emoji = event.detail?.value;
    if (!emoji) return;
    this.participantAnswerService.updateProfile({avatar: emoji});
  }

  private renderAvatars() {
    return html`
      <div class="radio-question">
        <div class="title">Avatar</div>
        <dl-avatar-picker
          .value=${this.participantAnswerService.profile?.avatar ?? null}
          button-label="Choose avatar"
          ?disabled=${this.participantService.disableStage}
          @emoji-selected=${this.handleAvatarChange}
        ></dl-avatar-picker>
      </div>
    `;
  }

  private renderGenderedAvatars() {
    const groups = [
      {emojis: WOMAN_EMOJIS},
      {emojis: MAN_EMOJIS},
      {emojis: PERSON_EMOJIS},
    ];
    const selectedAvatar = this.participantAnswerService.profile?.avatar;

    const handleClick = (emoji: string) => {
      this.participantAnswerService.updateProfile({avatar: emoji});
    };

    const getAvatarColor = (emoji: string) => {
      if (MAN_EMOJIS.indexOf(emoji) > -1) {
        return 'blue';
      } else if (WOMAN_EMOJIS.indexOf(emoji) > -1) {
        return 'pink';
      } else if (PERSON_EMOJIS.indexOf(emoji) > -1) {
        return 'purple';
      }
      return '';
    };

    return html`
      <div class="radio-question">
        <div class="title">Avatar</div>
        <div class="gendered-avatar-groups">
          ${groups.map(
            ({emojis}) => html`
              <div class="gendered-avatar-group">
                <div class="avatars-wrapper">
                  ${emojis.map((emoji) => {
                    const isSelected = selectedAvatar === emoji;
                    const color = getAvatarColor(emoji);
                    return html`
                      <button
                        type="button"
                        class=${classMap({
                          'avatar-choice': true,
                          'avatar-choice--selected': isSelected,
                          'avatar-choice--blue': color === 'blue',
                          'avatar-choice--pink': color === 'pink',
                          'avatar-choice--purple': color === 'purple',
                        })}
                        ?disabled=${this.participantService.disableStage}
                        aria-pressed=${isSelected}
                        aria-label=${`Select ${emoji}`}
                        @click=${() => handleClick(emoji)}
                      >
                        <avatar-icon
                          .emoji=${emoji}
                          .square=${true}
                          .color=${color}
                        ></avatar-icon>
                      </button>
                    `;
                  })}
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-participant-editor': ProfileEditor;
  }
}
