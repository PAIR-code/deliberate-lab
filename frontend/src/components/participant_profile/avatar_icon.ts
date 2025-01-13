import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles} from './avatar_icon.scss';

/** Avatar icon */
@customElement('avatar-icon')
export class Avatar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() emoji = '';
  @property() square = false;
  @property() small = false;
  @property() disabled = false;
  @property() tooltip = '';
  @property() color = '';

  override render() {
    const classes = classMap({
      avatar: true,
      small: this.small,
      square: this.square,
      disabled: this.disabled,
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
    'avatar-icon': Avatar;
  }
}
