import './gallery_card';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {Experiment, Visibility} from '@deliberation-lab/utils';
import {convertExperimentToGalleryItem} from '../../shared/experiment.utils';

import {styles} from './home_gallery.scss';

/** Gallery for home/landing page */
@customElement('home-gallery')
export class HomeGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const renderExperiment = (experiment: Experiment) => {
      const item = convertExperimentToGalleryItem(experiment);

      const navigate = () => {
        this.routerService.navigate(Pages.EXPERIMENT, {
          experiment: experiment.id,
        });
      };

      return html`
        <gallery-card .item=${item} @click=${navigate}></gallery-card>
      `;
    };

    const experiments = this.homeService.experiments
      .slice()
      .sort(
        (a, b) =>
          a.metadata.dateCreated.seconds - b.metadata.dateCreated.seconds,
      );

    const yourExperiments = experiments.filter(
      (e) => e.metadata.creator === this.authService.userEmail,
    );
    const otherExperiments = experiments.filter(
      (e) => e.metadata.creator !== this.authService.userEmail,
    );

    if (this.homeService.showMyExperiments) {
      return html`
        ${this.renderEmptyMessage(yourExperiments)}
        <div class="gallery-wrapper">
          ${yourExperiments.map((e) => renderExperiment(e))}
        </div>
      `;
    }

    return html`
      ${this.renderEmptyMessage(otherExperiments)}
      <div class="gallery-wrapper">
        ${otherExperiments.map((e) => renderExperiment(e))}
      </div>
    `;
  }

  private renderEmptyMessage(experiments: Experiment[]) {
    if (experiments.length > 0) return nothing;
    return html`<div class="empty-message">No experiments yet</div>`;
  }
}

/** Tabs for home/landing page */
@customElement('home-gallery-tabs')
export class HomeGalleryTabs extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly homeService = core.getService(HomeService);

  override render() {
    return html`
      <div class="gallery-tabs">
        <div
          class="gallery-tab ${this.homeService.showMyExperiments
            ? 'active'
            : ''}"
          @click=${() => {
            this.homeService.setShowMyExperiments(true);
          }}
        >
          My experiments
        </div>
        <div
          class="gallery-tab ${!this.homeService.showMyExperiments
            ? 'active'
            : ''}"
          @click=${() => {
            this.homeService.setShowMyExperiments(false);
          }}
        >
          Shared with me
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-gallery': HomeGallery;
    'home-gallery-tabs': HomeGalleryTabs;
  }
}
