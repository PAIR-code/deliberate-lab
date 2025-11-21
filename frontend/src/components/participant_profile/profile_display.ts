import '../../pair-components/tooltip';
import './avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  SECONDARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
  TERTIARY_PROFILE_SET_ID,
  ParticipantProfile,
  ParticipantProfileBase,
} from '@deliberation-lab/utils';

import {styles} from './profile_display.scss';
import {getHashBasedColor} from '../../shared/utils';
import {MAN_EMOJIS, WOMAN_EMOJIS, PERSON_EMOJIS} from '../../shared/constants';

enum ProfileDisplayType {
  // horizontal with small circle avatar + name (no pronouns)
  // (experimenter dashboard, header)
  DEFAULT = 'default',
  // horizontal with big circle avatar + name + pronouns
  // (chat panel)
  CHAT = 'chat',
  // horizontal with small circle avatar + name + pronouns
  // (small chat panel)
  CHAT_SMALL = 'chatSmall',
  // horizontal with big square avatar + name + pronouns
  // (ranking, per-participant survey stages)
  STAGE = 'stage',
  // vertical with big circle avatar + name + pronouns
  // (waiting screens)
  WAITING = 'waiting',
  // avatar with name in tooltip
  // (stage progress bars)
  PROGRESS = 'progress',
  // NOTE: For inline string with avatar and name,
  // use getParticipantInlineDisplay in shared/participant.utils
}

/** Participant profile name/avatar/pronouns display */
@customElement('participant-profile-display')
export class ParticipantProfileDisplay extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stageId = '';
  @property() profile: ParticipantProfile | undefined = undefined;
  @property() displayType: ProfileDisplayType = ProfileDisplayType.DEFAULT;

  // Disable profile
  @property() isDisabled = false;

  // Display (you) indicator that the profile is the current user
  @property() showIsSelf = false;

  override render() {
    if (!this.profile) return nothing;

    const nameFallback =
      this.displayType === ProfileDisplayType.DEFAULT ||
      this.displayType === ProfileDisplayType.CHAT
        ? this.profile.publicId
        : '';

    // Use profile ID to determine color
    const color = () => {
      // If publicId is in format animal-color-number, extract color
      const splitId = (this.profile?.publicId ?? '').split('-');
      if (splitId.length >= 3) {
        return splitId[1];
      }
      // Otherwise, use publicId as hash
      return getHashBasedColor(this.profile?.publicId);
    };

    // If alternate profile ID in stage ID, use anonymous profile
    let baseProfile: ParticipantProfileBase = this.profile;
    if (this.stageId?.includes(SECONDARY_PROFILE_SET_ID)) {
      const anon = this.profile.anonymousProfiles[PROFILE_SET_ANIMALS_2_ID];
      if (anon) {
        baseProfile = {
          name: `${anon.name}`,
          avatar: `${anon.avatar}`,
          pronouns: null,
        };
      }
    } else if (this.stageId?.includes(TERTIARY_PROFILE_SET_ID)) {
      const anon = this.profile.anonymousProfiles[PROFILE_SET_NATURE_ID];
      if (anon) {
        baseProfile = {
          name: `${anon.name}`,
          avatar: `${anon.avatar}`,
          pronouns: null,
        };
      }
    }

    return html`
      <profile-display
        .profile=${baseProfile}
        .displayType=${this.displayType}
        .isDisabled=${this.isDisabled}
        .nameFallback=${nameFallback}
        .color=${color()}
        .showIsSelf=${this.showIsSelf}
      >
      </profile-display>
    `;
  }
}

/** Profile name/avatar/pronouns display */
@customElement('profile-display')
export class ProfileDisplay extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() profile: ParticipantProfileBase | undefined = undefined;
  @property() displayType: ProfileDisplayType = ProfileDisplayType.DEFAULT;
  @property() color = '';

  // Fallback if name is empty
  @property() nameFallback = '';

  // Disable profile
  @property() isDisabled = false;

  // Display (you) indicator that the profile is the current user
  @property() showIsSelf = false;

  override render() {
    if (!this.profile) return nothing;

    // Pass color into avatar-icon
    const getColor = () => {
      const avatar = this.profile?.avatar;
      if (!avatar) {
        return ''; // empty avatar
      }

      if (MAN_EMOJIS.indexOf(avatar) > -1) {
        return 'blue';
      } else if (WOMAN_EMOJIS.indexOf(avatar) > -1) {
        return 'pink';
      } else if (PERSON_EMOJIS.indexOf(avatar) > -1) {
        return 'purple';
      } else {
        return this.color;
      }
    };

    const getName = () => {
      if (this.profile?.name === '') {
        return this.nameFallback;
      }
      return this.profile?.name ?? this.nameFallback;
    };

    const renderName = () => {
      const name = getName();
      if (name.length > 20) {
        return html`
          <pr-tooltip text=${name} position="TOP_START">
            <div class="display-name truncated">${name}</div>
          </pr-tooltip>
        `;
      }
      return html`<div class="display-name">${name}</div>`;
    };

    const renderPronouns = () => {
      if (this.profile?.pronouns) {
        return html`<div class="pronouns">(${this.profile.pronouns})</div>`;
      }
      return nothing;
    };

    if (this.displayType === ProfileDisplayType.DEFAULT) {
      return html`
        <div class="horizontal-profile small">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .isDisabled=${this.isDisabled}
            .color=${getColor()}
            .small=${true}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${renderName()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (
      this.displayType === ProfileDisplayType.CHAT ||
      this.displayType === ProfileDisplayType.CHAT_SMALL
    ) {
      const isSmall = this.displayType === ProfileDisplayType.CHAT_SMALL;
      return html`
        <div class="horizontal-profile ${isSmall ? 'small' : ''}">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .color=${getColor()}
            .isDisabled=${this.isDisabled}
            .small=${isSmall}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${getName()} ${renderPronouns()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (this.displayType === ProfileDisplayType.WAITING) {
      // TODO: Truncate names if too long?
      return html`
        <div class="waiting-profile">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .color=${getColor()}
            .isDisabled=${this.isDisabled}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${getName()} ${renderPronouns()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (this.displayType === ProfileDisplayType.PROGRESS) {
      const tooltip = `${getName()}${this.showIsSelf ? ' (you)' : ''}`;
      return html`
        <avatar-icon
          .small=${true}
          .color=${getColor()}
          .emoji=${this.profile.avatar}
          .tooltip=${tooltip}
        >
        </avatar-icon>
      `;
    }

    return html`
      <div class="horizontal-profile">
        <avatar-icon
          .emoji=${this.profile.avatar}
          .isDisabled=${this.isDisabled}
          .color=${getColor()}
          .square=${this.displayType === ProfileDisplayType.STAGE}
        >
        </avatar-icon>
        <div class="display-name-wrapper">
          ${renderName()} ${renderPronouns()}
          ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-profile-display': ParticipantProfileDisplay;
    'profile-display': ProfileDisplay;
  }
}
