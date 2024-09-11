import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {HomeService} from '../../services/home.service';

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
        ${this.item.isPublic ? nothing : html`<div class="chip">private</div>`}
      </div>
      <div class="description">${this.item.description}</div>
      <div class="footer">
        <div>${this.homeService.getExperimenterName(this.item.creator)}</div>
        <div>${this.item.date}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gallery-card': GalleryCard;
  }
}
