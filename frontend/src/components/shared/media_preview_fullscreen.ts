import {LitElement, html, nothing, CSSResultGroup} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  FileCategory,
  getFileCategory,
  StoredFile,
} from '@deliberation-lab/utils';

import {styles} from './media_preview_fullscreen.scss';

/**
 * A fullscreen modal component for viewing media files.
 * Initially supports images, extensible for video/audio.
 */
@customElement('media-preview-fullscreen')
export class MediaPreviewFullscreen extends LitElement {
  constructor() {
    super();
  }

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
        <div class="modal-content">
          <button class="close-button" @click=${this.close}>✕</button>
          ${this.renderMedia()}
        </div>
      </div>
    `;
  }

  private renderMedia() {
    if (!this.file) {
      return nothing;
    }

    switch (getFileCategory(this.file)) {
      case FileCategory.IMAGE:
        return html`
          <img
            src="${this.file.url}"
            alt="Fullscreen image"
            @click=${(e: Event) => e.stopPropagation()}
          />
        `;
      case FileCategory.VIDEO:
        return html`
          <video
            src="${this.file.url}"
            controls
            autoplay
            @click=${(e: Event) => e.stopPropagation()}
          ></video>
        `;
      case FileCategory.AUDIO:
        return html`
          <audio
            src="${this.file.url}"
            controls
            autoplay
            @click=${(e: Event) => e.stopPropagation()}
          ></audio>
        `;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-preview-fullscreen': MediaPreviewFullscreen;
  }
}
