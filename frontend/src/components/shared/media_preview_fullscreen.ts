import './media_preview';

import {LitElement, html, nothing, CSSResultGroup} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {StoredFile} from '@deliberation-lab/utils';

import {styles} from './media_preview_fullscreen.scss';

/**
 * A fullscreen modal component for viewing media files.
 * Reuses media-preview for content rendering, adding modal behavior
 * (backdrop, escape key, close button).
 */
@customElement('media-preview-fullscreen')
export class MediaPreviewFullscreen extends LitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Object}) file: StoredFile | undefined;

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

  private close = () => {
    this.dispatchEvent(new CustomEvent('close'));
  };

  override render() {
    if (!this.file) {
      return nothing;
    }

    return html`
      <div class="fullscreen-modal" @click=${this.close}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <button class="close-button" @click=${this.close}>✕</button>
          <media-preview
            .file=${this.file}
            .allowFullscreen=${false}
            expanded
          ></media-preview>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-preview-fullscreen': MediaPreviewFullscreen;
  }
}
