/* Note: This is not a PAIR component. This is an element. */
import './icon';
import './icon_button';

import {html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {styles} from './info_popup.scss';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from './../shared/utils';

/**
 * Renders a info popup component.
 */
@customElement('info-popup')
export class InfoPopupComponent extends LitElement {
  static override get styles() {
    return [styles];
  }

  @property({type: Object}) handleClose: () => void = () => {};
  @property() popupText: string = '';
  @property() showHelpIcon: boolean = false;
  @state() private showModal: boolean = false;

  private handleButtonClick() {
    this.showModal = true;
  }

  private handleOutsideClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal')) {
      this.showModal = false;
    }
  }

  override render() {
    const icon = this.showHelpIcon ? 'help' : 'info';
    return html`
      <pr-icon-button
        variant="default"
        color="${this.showHelpIcon ? 'tertiary' : 'secondary'}"
        size="large"
        icon="${icon}"
        @click=${this.handleButtonClick}
        >${icon}</pr-icon-button
      >
      <div
        class="modal"
        style=${this.showModal ? 'display: block;' : 'display: none;'}
        @click=${this.handleOutsideClick}
      >
        <div class="modal-content">
          <p>${unsafeHTML(convertMarkdownToHTML(this.popupText))}</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'info-popup': InfoPopupComponent;
  }
}
