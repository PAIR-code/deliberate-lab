import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import { GalleryItem } from '../../shared/types';

import {styles} from './gallery_card.scss';

/** Gallery card */
@customElement('gallery-card')
export class GalleryCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() item: GalleryItem | null = null;

  override render() {
    if (!this.item) {
      return nothing;
    }

    return html`
      <div class="header">
        <div class="title">${this.item.title}</div>
      </div>
      <div class="description">${this.item.description}</div>
      <div class="footer">
        <div>${this.item.creator}</div>
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
