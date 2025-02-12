import './button';
import './icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles} from './menu.scss';

type MenuVariant = 'default' | 'outlined';

/** Dropdown menu component */
@customElement('pr-menu')
export class Menu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() name = '';
  @property() icon = '';
  @property() variant: MenuVariant = 'default';
  @property({type: Boolean}) disabled = false;

  @state() showMenu = false;

  override render() {
    const toggleMenu = () => {
      this.showMenu = !this.showMenu;
    };

    const menuClasses = classMap({
      'menu-wrapper': true,
      'show-menu': this.showMenu && !this.disabled,
    });

    return html`
      <pr-button
        variant=${this.variant}
        @click=${toggleMenu}
        ?disabled=${this.disabled}
      >
        <div class="button-content">
          ${this.renderIcon(this.icon)}
          <div>${this.name}</div>
          ${this.renderIcon('keyboard_arrow_down')}
        </div>
      </pr-button>
      <div class=${menuClasses} @click=${toggleMenu}>
        <div class="menu">${this.disabled ? nothing : html`<slot></slot>`}</div>
      </div>
    `;
  }

  private renderIcon(icon: string) {
    if (icon === '') {
      return nothing;
    }
    return html`
      <pr-icon padding="small" size="small" icon=${icon}></pr-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-menu': Menu;
  }
}
