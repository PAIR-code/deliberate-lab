import '../../pair-components/icon';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import './gallery_card';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';
import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {Experiment} from '@deliberation-lab/utils';
import {convertExperimentToGalleryItem} from '../../shared/experiment.utils';
import {
  getQuickstartAgentGroupChatTemplate,
  getQuickstartGroupChatTemplate,
} from '../../shared/templates/quickstart_group_chat';
import {getQuickstartPrivateChatTemplate} from '../../shared/templates/quickstart_private_chat';

import {styles} from './home_gallery.scss';

type SortMode = 'newest' | 'oldest' | 'alpha_asc' | 'alpha_desc';

@customElement('home-gallery')
export class HomeGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);

  @state() private searchQuery = '';
  @state() private sortMode: SortMode = 'newest';
  @state() private refreshing = false;

  private sortLabel(mode: SortMode) {
    switch (mode) {
      case 'newest':
        return 'Newest first';
      case 'oldest':
        return 'Oldest first';
      case 'alpha_asc':
        return 'A–Z';
      case 'alpha_desc':
        return 'Z–A';
    }
  }

  private async setSort(mode: SortMode) {
    this.sortMode = mode;
    this.refreshing = true;
    await new Promise((r) => setTimeout(r, 120));
    this.refreshing = false;
  }

  private sortExperiments(experiments: Experiment[]) {
    switch (this.sortMode) {
      case 'alpha_asc':
        return experiments
          .slice()
          .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
      case 'alpha_desc':
        return experiments
          .slice()
          .sort((a, b) => b.metadata.name.localeCompare(a.metadata.name));
      case 'oldest':
        return experiments
          .slice()
          .sort(
            (a, b) =>
              a.metadata.dateModified.seconds - b.metadata.dateModified.seconds,
          );
      case 'newest':
      default:
        return experiments
          .slice()
          .sort(
            (a, b) =>
              b.metadata.dateModified.seconds - a.metadata.dateModified.seconds,
          );
    }
  }

  private returnControlsHtml() {
    return html`
      <div class="controls">
        <div class="search-container">
          <pr-icon icon="search" size="small"></pr-icon>
          <pr-textarea
            placeholder="Search"
            .value=${this.searchQuery}
            @input=${(e: InputEvent) =>
              (this.searchQuery = (e.target as HTMLTextAreaElement).value)}
          ></pr-textarea>
        </div>

        <pr-menu
          name=${this.sortLabel(this.sortMode)}
          icon="sort"
          color="neutral"
        >
          <div class="menu-wrapper">
            <div class="menu-item" @click=${() => this.setSort('newest')}>
              Newest first
              ${this.sortMode === 'newest'
                ? html`<span class="checkmark">✔</span>`
                : nothing}
            </div>

            <div class="menu-item" @click=${() => this.setSort('oldest')}>
              Oldest first
              ${this.sortMode === 'oldest'
                ? html`<span class="checkmark">✔</span>`
                : nothing}
            </div>

            <div class="menu-item" @click=${() => this.setSort('alpha_asc')}>
              Alphabetical (A–Z)
              ${this.sortMode === 'alpha_asc'
                ? html`<span class="checkmark">✔</span>`
                : nothing}
            </div>

            <div class="menu-item" @click=${() => this.setSort('alpha_desc')}>
              Alphabetical (Z–A)
              ${this.sortMode === 'alpha_desc'
                ? html`<span class="checkmark">✔</span>`
                : nothing}
            </div>
          </div>
        </pr-menu>
      </div>
    `;
  }

  override render() {
    const renderExperiment = (experiment: Experiment) => {
      const item = convertExperimentToGalleryItem(experiment);
      const navigate = () =>
        this.routerService.navigate(Pages.EXPERIMENT, {
          experiment: experiment.id,
        });
      return html`<gallery-card
        .item=${item}
        @click=${navigate}
      ></gallery-card>`;
    };

    let experiments = [...this.homeService.experiments];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      experiments = experiments.filter((e) =>
        e.metadata.name?.toLowerCase().includes(q),
      );
    }

    experiments = this.sortExperiments(experiments);

    const yourExperiments = experiments.filter(
      (e) => e.metadata.creator === this.authService.userEmail,
    );
    const otherExperiments = experiments.filter(
      (e) =>
        e.metadata.creator !== this.authService.userEmail &&
        this.authService.isViewedExperiment(e.id),
    );

    const list = this.homeService.showMyExperiments
      ? yourExperiments
      : otherExperiments;

    const banner = this.homeService.showMyExperiments
      ? nothing
      : html`
          <div class="banner">
            Experiments by others will only be shown in this tab if they are
            shared publicly and have been viewed by you before. Ask the creator
            to share the link with you.
          </div>
        `;

    return html`
      <home-gallery-tabs>
        <div slot="gallery-controls">${this.returnControlsHtml()}</div>
      </home-gallery-tabs>
      <div class="gallery-wrapper ${this.refreshing ? 'hidden' : ''}">
        ${banner} ${this.renderEmptyMessage(list)}
        ${repeat(
          list,
          (e) => e.id,
          (e) => renderExperiment(e),
        )}
      </div>

      ${this.refreshing ? html`<div class="placeholder"></div>` : nothing}
    `;
  }

  private renderEmptyMessage(experiments: Experiment[]) {
    if (experiments.length > 0) return nothing;
    return html`<div class="empty-message">No experiments yet</div>`;
  }
}

@customElement('home-gallery-tabs')
export class HomeGalleryTabs extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly homeService = core.getService(HomeService);

  override render() {
    return html`
      <div class="gallery-header-row">
        <div class="gallery-tabs">
          <div
            class="gallery-tab ${this.homeService.showMyExperiments
              ? 'active'
              : ''}"
            @click=${() => this.homeService.setShowMyExperiments(true)}
          >
            My experiments
          </div>
          <div
            class="gallery-tab ${!this.homeService.showMyExperiments
              ? 'active'
              : ''}"
            @click=${() => this.homeService.setShowMyExperiments(false)}
          >
            Shared with me
          </div>
        </div>

        <slot name="gallery-controls"></slot>
      </div>
    `;
  }
}

/* Quick start cards for home/landing page */
@customElement('quick-start-gallery')
export class QuickStartGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      <div class="quick-start-wrapper">
        <div class="gallery-wrapper">
          <div
            class="quick-start-card blank"
            @click=${() => {
              this.routerService.navigate(Pages.EXPERIMENT_CREATE);
            }}
          >
            <pr-icon icon="add_2" color="neutral" size="large"></pr-icon>
            <div>Build experiment from scratch</div>
          </div>
          <div
            class="quick-start-card"
            @click=${() => {
              this.routerService.navigate(Pages.EXPERIMENT_CREATE);
              this.experimentEditor.loadTemplate(
                getQuickstartAgentGroupChatTemplate(),
              );
            }}
          >
            <pr-icon icon="groups_3" color="neutral" size="large"></pr-icon>
            <div>Group chat with agent mediator</div>
          </div>
          <div
            class="quick-start-card"
            @click=${() => {
              this.routerService.navigate(Pages.EXPERIMENT_CREATE);
              this.experimentEditor.loadTemplate(
                getQuickstartPrivateChatTemplate(),
              );
            }}
          >
            <pr-icon icon="3p" color="neutral" size="large"></pr-icon>
            <div>Private chat with agent</div>
          </div>
          <div
            class="quick-start-card"
            @click=${() => {
              this.routerService.navigate(Pages.EXPERIMENT_CREATE);
              this.experimentEditor.loadTemplate(
                getQuickstartGroupChatTemplate(),
              );
            }}
          >
            <pr-icon icon="groups" color="neutral" size="large"></pr-icon>
            <div>Group chat with<br />no agents</div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-gallery': HomeGallery;
    'home-gallery-tabs': HomeGalleryTabs;
    'quick-start-gallery': QuickStartGallery;
  }
}
