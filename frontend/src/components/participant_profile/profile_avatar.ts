import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles} from './profile_avatar.scss';
import {getColor} from '../../shared/utils';
import {
  MAN_EMOJIS,
  WOMAN_EMOJIS,
  PERSON_EMOJIS
} from '../../shared/constants';

/** Participant profile avatar */
@customElement('profile-avatar')
export class ProfileAvatar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() emoji = '';
  @property() square = false;
  @property() small = false;
  @property() disabled = false;
  @property() tooltip = '';
  @property() color = '';

  override render() {
    if (!this.emoji) return;

    // TODO: Remove temporary hash-based color assignment
    this.color = getColor(this.emoji);

    const classes = classMap({
      avatar: true,
      small: this.small,
      square: this.square,
      disabled: this.disabled,
      man: MAN_EMOJIS.indexOf(this.emoji) > -1,
      woman: WOMAN_EMOJIS.indexOf(this.emoji) > -1,
      person: PERSON_EMOJIS.indexOf(this.emoji) > -1,
      red: this.color === 'red',
      orange: this.color === 'orange',
      yellow: this.color === 'yellow',
      blue: this.color === 'blue',
      green: this.color === 'green',
      purple: this.color === 'purple',
      pink: this.color === 'pink',
    });

    return html`
      <pr-tooltip text=${this.tooltip}>
        <div class=${classes}>${this.emoji}</div>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-avatar': ProfileAvatar;
  }
}
