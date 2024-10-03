import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles} from './profile_avatar.scss';
import {getHashIntegerFromString} from '@deliberation-lab/utils';
import {
  MAN_EMOJIS,
  WOMAN_EMOJIS,
  PERSON_EMOJIS
} from '../../shared/constants';
import {getAvatarBackgroundColor} from '../../shared/participant.utils';

/** Participant profile avatar */
@customElement('profile-avatar')
export class ProfileAvatar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() emoji = '';
  @property() square = false;
  @property() small = false;
  @property() disabled = false;
  @property() tooltip = '';

  override render() {
    const classes = classMap({
      avatar: true,
      small: this.small,
      square: this.square,
      disabled: this.disabled,
      man: MAN_EMOJIS.indexOf(this.emoji) > -1,
      woman: WOMAN_EMOJIS.indexOf(this.emoji) > -1,
      person: PERSON_EMOJIS.indexOf(this.emoji) > -1,
    });
    if (!this.emoji) return;

    // Set background color for non-person emoji
    const isOther =
      MAN_EMOJIS.indexOf(this.emoji) === -1 &&
      WOMAN_EMOJIS.indexOf(this.emoji) === -1 &&
      PERSON_EMOJIS.indexOf(this.emoji) === -1;

    const style = isOther ? `background:${getAvatarBackgroundColor(this.emoji)}` : '';
    const emojiHtml = html`
      <div class=${classes} style="${style}">${this.emoji}</div>
    `;

    if (this.tooltip.length > 0) {
      return html` <pr-tooltip text=${this.tooltip}>${emojiHtml}</pr-tooltip> `;
    }
    return emojiHtml;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-avatar': ProfileAvatar;
  }
}
