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
import {HomeService, HomeTab} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  Experiment,
  ExperimentTemplate,
  SortMode,
  sortLabel,
  sortExperiments,
  Visibility,
} from '@deliberation-lab/utils';
import {GalleryItem} from '../../shared/types';
import {convertExperimentToGalleryItem} from '../../shared/experiment.utils';
import {
  getQuickstartAgentGroupChatTemplate,
  getQuickstartGroupChatTemplate,
} from '../../shared/templates/quickstart_group_chat';
import {getQuickstartPrivateChatTemplate} from '../../shared/templates/quickstart_private_chat';

import {styles} from './home_gallery.scss';

@customElement('home-gallery')
export class HomeGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);

  @state() private sortMode: SortMode = SortMode.NEWEST;
  @state() private refreshing = false;

  private async setSort(mode: SortMode) {
    this.sortMode = mode;
    this.refreshing = true;
    await new Promise((r) => setTimeout(r, 120));
    this.refreshing = false;
  }

  private renderControls() {
    const renderSortItem = (mode: SortMode, label: string) => {
      return html`
        <div class="menu-item" @click=${() => this.setSort(mode)}>
          ${label}
          ${this.sortMode === mode
            ? html`<span class="checkmark">✔</span>`
            : nothing}
        </div>
      `;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLTextAreaElement).blur();
      }
    };

    const clearSearch = () => {
      this.homeService.setSearchQuery('');
    };

    return html`
      <div class="controls">
        <div class="search-container">
          <pr-icon icon="search" size="small"></pr-icon>
          <pr-textarea
            placeholder="Search"
            .value=${this.homeService.searchQuery}
            @input=${(e: InputEvent) =>
              this.homeService.setSearchQuery(
                (e.target as HTMLTextAreaElement).value,
              )}
            @keydown=${handleKeyDown}
          ></pr-textarea>
          ${this.homeService.searchQuery
            ? html`<pr-icon
                icon="close"
                size="small"
                class="clear-button"
                @click=${clearSearch}
              ></pr-icon>`
            : nothing}
        </div>

        <pr-menu name=${sortLabel(this.sortMode)} icon="sort" color="neutral">
          <div class="menu-wrapper">
            ${renderSortItem(SortMode.NEWEST, 'Newest first')}
            ${renderSortItem(SortMode.OLDEST, 'Oldest first')}
            ${renderSortItem(SortMode.ALPHA_ASC, 'Alphabetical (A–Z)')}
            ${renderSortItem(SortMode.ALPHA_DESC, 'Alphabetical (Z–A)')}
          </div>
        </pr-menu>
      </div>
    `;
  }

  override render() {
    const renderExperiment = (experiment: Experiment) => {
      const item = convertExperimentToGalleryItem(experiment);
      const href = `#/e/${experiment.id}`;

      return html`<a href=${href} class="gallery-link">
        <gallery-card .item=${item}></gallery-card>
      </a>`;
    };

    const list = this.getList();

    const banner =
      this.homeService.activeTab !== HomeTab.SHARED_WITH_ME
        ? nothing
        : html`
            <div class="banner">
              Experiments by others will only be shown in this tab if they are
              shared publicly and have been viewed by you before. Ask the
              creator to share the link with you.
            </div>
          `;

    return html`
      <home-gallery-tabs>
        <div slot="gallery-controls">${this.renderControls()}</div>
      </home-gallery-tabs>
      <div class="gallery-wrapper ${this.refreshing ? 'hidden' : ''}">
        ${banner} ${this.renderEmptyMessage(list)}
        ${repeat(
          list,
          (e) => e.id,
          (e: Experiment) => renderExperiment(e),
        )}
      </div>

      ${this.refreshing ? html`<div class="placeholder"></div>` : nothing}
    `;
  }

  private getList() {
    let experiments = [...this.homeService.experiments];

    // 1. Filter by search
    if (this.homeService.searchQuery.trim()) {
      const q = this.homeService.searchQuery.toLowerCase();
      experiments = experiments.filter((e) =>
        e.metadata.name?.toLowerCase().includes(q),
      );
    }

    // 2. Sort
    experiments = sortExperiments(experiments, this.sortMode);

    // 3. Filter by tab
    if (this.homeService.activeTab === HomeTab.MY_EXPERIMENTS) {
      return experiments.filter(
        (e) => e.metadata.creator === this.authService.userEmail,
      );
    } else if (this.homeService.activeTab === HomeTab.SHARED_WITH_ME) {
      return experiments.filter(
        (e) =>
          e.metadata.creator !== this.authService.userEmail &&
          this.authService.isViewedExperiment(e.id),
      );
    } else {
      return [];
    }
  }

  private renderEmptyMessage(list: Experiment[]) {
    if (list.length > 0) return nothing;
    return html`<div class="empty-message">No items found</div>`;
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
            class="gallery-tab ${this.homeService.activeTab ===
            HomeTab.MY_EXPERIMENTS
              ? 'active'
              : ''}"
            @click=${() =>
              this.homeService.setActiveTab(HomeTab.MY_EXPERIMENTS)}
          >
            My experiments
          </div>
          <div
            class="gallery-tab ${this.homeService.activeTab ===
            HomeTab.SHARED_WITH_ME
              ? 'active'
              : ''}"
            @click=${() =>
              this.homeService.setActiveTab(HomeTab.SHARED_WITH_ME)}
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
  public readonly homeService: HomeService = core.getService(HomeService);

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
          <div
            class="quick-start-card outlined"
            @click=${() => {
              this.homeService.setTemplatesOpen(true);
            }}
          >
            <pr-icon icon="dataset" color="neutral" size="large"></pr-icon>
            <div>Browse all<br />templates</div>
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
