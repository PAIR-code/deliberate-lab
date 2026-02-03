import {LitElement, html, CSSResultGroup} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  FileCategory,
  getFileCategory,
  getFileExtension,
  StoredFile,
} from '@deliberation-lab/utils';

import {styles} from './media_preview.scss';

/**
 * A reusable component for rendering media files (images, video, audio)
 * or download links based on file type.
 */
@customElement('media-preview')
export class MediaPreview extends LitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Object}) file: StoredFile | undefined = undefined;
  @property({type: Boolean}) allowFullscreen = true;
  @property({type: Boolean, reflect: true}) expanded = false;

  private handleImageClick = () => {
    if (this.allowFullscreen && this.file) {
      this.dispatchEvent(
        new CustomEvent('maximize', {
          detail: {file: this.file},
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  override render() {
    if (!this.file) {
      return html``;
    }

    switch (getFileCategory(this.file)) {
      case FileCategory.IMAGE:
        return html`<img
          src="${this.file.url}"
          alt="Generated image"
          class="${this.allowFullscreen ? 'clickable' : ''}"
          @click=${this.handleImageClick}
        />`;
      case FileCategory.VIDEO:
        return html`<video src="${this.file.url}" controls></video>`;
      case FileCategory.AUDIO:
        return html`<audio src="${this.file.url}" controls></audio>`;
      default:
        return html`<a
          href="${this.file.url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          📎 Download ${getFileExtension(this.file)} file
        </a>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-preview': MediaPreview;
  }
}
