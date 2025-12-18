import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {styles} from './fullscreen_image.scss';

/** Fullscreen image modal component */
@customElement('fullscreen-image')
export class FullscreenImage extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() imageUrl = '';

  private handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  override render() {
    if (!this.imageUrl) {
      return nothing;
    }

    return html`
      <div class="fullscreen-image-modal" @click=${this.close}>
        <div class="modal-content">
          <button class="close-button" @click=${this.close}>✕</button>
          <img
            src="${this.imageUrl}"
            alt="Maximized Image"
            @click=${(e: Event) => e.stopPropagation()}
          />
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fullscreen-image': FullscreenImage;
  }
}
