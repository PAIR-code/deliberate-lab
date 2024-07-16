/* Note: This is not a PAIR component. This is an element. */
import "./icon";
import "./icon_button";

import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styles } from "./info_popup.scss";

import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { convertMarkdownToHTML } from "./../shared/utils";

/**
 * Renders a info popup component.
 */
@customElement('info-popup')
export class InfoPopupComponent extends LitElement {
  static override get styles() {
    return [styles];
  }

  @property({type: Object}) handleClose: () => void = () => {};
  @property() popupText: string = "";
  @state() private showModal: boolean = false;

  private handleButtonClick() {
    this.showModal = true;
  }

  private handleCloseClick() {
    this.showModal = false;
  }

  private handleOutsideClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal')) {
      this.showModal = false;
    }
  }

  override render() {
    return html`
    <pr-icon-button color="secondary" variant="default" icon="info" @click=${this.handleButtonClick}>info</pr-icon-button>

    <div class="modal" style=${this.showModal ? 'display: block;' : 'display: none;'} @click=${this.handleOutsideClick}>
      <div class="modal-content">
        <pr-icon-button color="neutral" class="close" variant="default" icon="close" @click=${this.handleCloseClick}></pr-icon-button>
        ${unsafeHTML(convertMarkdownToHTML(this.popupText))}
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