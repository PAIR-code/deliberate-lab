import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {HomeService} from '../../services/home.service';

import {EXPERIMENT_VERSION_ID} from '@deliberation-lab/utils';

import {GalleryItem} from '../../shared/types';

import {styles} from './gallery_card.scss';

/** Gallery card */
@customElement('gallery-card')
export class GalleryCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly homeService = core.getService(HomeService);

  @property() item: GalleryItem | null = null;

  override render() {
    if (!this.item) {
      return nothing;
    }

    return html`
      <div class="header">
        <div class="title">${this.item.title}</div>
        <div class="right">
          ${this.item.isPublic
            ? html`<div class="chip tertiary">public</div>`
            : html`<div class="chip">private</div>`}
          ${this.renderOutdatedChip()}
        </div>
      </div>
      <div class="description">${this.item.description}</div>
      <div class="footer">
        <div>${this.homeService.getExperimenterName(this.item.creator)}</div>
        <div>${this.item.date}</div>
      </div>
    `;
  }

  private renderOutdatedChip() {
    if (this.item?.version === EXPERIMENT_VERSION_ID) {
      return nothing;
    }

    const tooltipText = `
      Warning: This experiment was created with a previous version of
      Deliberate Lab and may not be compatible with the current version.
      Contact the deployment owners if you have additional questions
    `;

    return html`
      <pr-tooltip text=${tooltipText} color="error" position="TOP_END">
        <div class="chip">⚠️</div>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gallery-card': GalleryCard;
  }
}
