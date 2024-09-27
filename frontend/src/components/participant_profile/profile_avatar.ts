import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles} from './profile_avatar.scss';

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
      man: ['👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'].indexOf(this.emoji) > -1,
      woman: ['👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'].indexOf(this.emoji) > -1,
      person: ['🧑🏻', '🧑🏼', '🧑🏽', '🧑🏾', '🧑🏿'].indexOf(this.emoji) > -1,
    });

    const emojiHtml = html`
      <div class=${classes}>
        ${this.emoji}
      </div>
    `;

    if (this.tooltip.length > 0) {
      return html`
        <pr-tooltip text=${this.tooltip}>${emojiHtml}</pr-tooltip>
      `;
    }
    return emojiHtml;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-avatar': ProfileAvatar;
  }
}