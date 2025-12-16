import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {HomeService} from '../../services/home.service';
import {RouterService, Pages} from '../../services/router.service';

import {
  Experiment,
  ExperimentTemplate,
  SortMode,
  sortLabel,
  sortExperiments,
  Visibility,
} from '@deliberation-lab/utils';

import {
  CodeBasedTemplate,
  DEFAULT_TEMPLATES,
  RESEARCH_TEMPLATES,
} from '../../shared/default_templates';
import {styles} from './template_gallery.scss';

enum TemplateTab {
  OWNED_BY_ME = 'owned_by_me',
  SHARED_WITH_ME = 'shared_with_me',
  DEFAULT = 'default_from_app',
}

@customElement('template-gallery')
export class TemplateGallery extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  @state() private activeTab: TemplateTab = TemplateTab.DEFAULT;
  @state() private sortMode: SortMode = SortMode.NEWEST;
  @state() private searchQuery = '';
  @state() private refreshing = false;

  private async setSort(mode: SortMode) {
    this.sortMode = mode;
    this.refreshing = true;
    await new Promise((r) => setTimeout(r, 120));
    this.refreshing = false;
  }

  private renderControls() {
    const renderSortItem = (mode: SortMode, label: string) => {
      // Sort is only relevant for non-default templates or if we implement sort for default ones
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
      this.searchQuery = '';
    };

    return html`
      <div class="controls">
        <div class="search-container">
          <pr-icon icon="search" size="small"></pr-icon>
          <pr-textarea
            placeholder="Search templates"
            .value=${this.searchQuery}
            @input=${(e: InputEvent) => {
              this.searchQuery = (e.target as HTMLTextAreaElement).value;
            }}
            @keydown=${handleKeyDown}
          ></pr-textarea>
          ${this.searchQuery
            ? html`<pr-icon
                icon="close"
                size="small"
                class="clear-button"
                @click=${clearSearch}
              ></pr-icon>`
            : nothing}
        </div>

        ${this.activeTab !== TemplateTab.DEFAULT
          ? html`
              <pr-menu
                name=${sortLabel(this.sortMode)}
                icon="sort"
                color="neutral"
              >
                <div class="menu-wrapper">
                  ${renderSortItem(SortMode.NEWEST, 'Newest first')}
                  ${renderSortItem(SortMode.OLDEST, 'Oldest first')}
                  ${renderSortItem(SortMode.ALPHA_ASC, 'Alphabetical (A–Z)')}
                  ${renderSortItem(SortMode.ALPHA_DESC, 'Alphabetical (Z–A)')}
                </div>
              </pr-menu>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    const list = this.getList();

    return html`
      <div class="gallery-header-row">
        <div class="gallery-tabs">
          <div
            class="gallery-tab ${this.activeTab === TemplateTab.DEFAULT
              ? 'active'
              : ''}"
            @click=${() => (this.activeTab = TemplateTab.DEFAULT)}
          >
            Recommended
          </div>
          <div
            class="gallery-tab ${this.activeTab === TemplateTab.OWNED_BY_ME
              ? 'active'
              : ''}"
            @click=${() => (this.activeTab = TemplateTab.OWNED_BY_ME)}
          >
            Owned by me
          </div>
          <div
            class="gallery-tab ${this.activeTab === TemplateTab.SHARED_WITH_ME
              ? 'active'
              : ''}"
            @click=${() => (this.activeTab = TemplateTab.SHARED_WITH_ME)}
          >
            Shared with me
          </div>
        </div>
        <div slot="gallery-controls">${this.renderControls()}</div>
      </div>

      <div class="gallery-wrapper ${this.refreshing ? 'hidden' : ''}">
        ${this.renderEmptyMessage(list)}
        ${this.activeTab === TemplateTab.DEFAULT
          ? this.renderDefaultList(list as CodeBasedTemplate[])
          : this.renderExperimentList(list as ExperimentTemplate[])}
      </div>
    `;
  }

  private renderEmptyMessage(list: unknown[]) {
    if (list.length > 0) return nothing;
    return html`<div class="empty-message">No templates found</div>`;
  }

  private renderDefaultList(list: CodeBasedTemplate[]) {
    return repeat(
      list,
      (t) => t.id,
      (t) => html`
        <div class="card template-card">
          <div
            class="card-content"
            @click=${() => {
              this.loadDefaultTemplate(t);
            }}
          >
            <div class="title">${t.name}</div>
            <div class="description">${t.description}</div>
            <div class="template-footer">
              <div class="chip secondary">Default</div>
            </div>
          </div>
        </div>
      `,
    );
  }

  private loadDefaultTemplate(t: CodeBasedTemplate) {
    const template = t.factory();
    this.experimentEditor.loadTemplate(template);
    this.routerService.navigate(Pages.EXPERIMENT_CREATE);
  }

  private renderExperimentList(list: ExperimentTemplate[]) {
    return repeat(
      list,
      (t) => t.id,
      (t) => this.renderTemplateCard(t),
    );
  }

  private renderTemplateCard(template: ExperimentTemplate) {
    const metadata = template.experiment.metadata;

    const createHref = `#/templates/new_template?template=${template.id}`;

    return html`
      <div class="card template-card">
        <a href="${createHref}" class="gallery-link" title="Use template">
          <div class="card-content">
            <div class="title">${metadata.name}</div>
            <div class="description">${metadata.description}</div>
            <div class="template-footer">
              <div class="creator">
                By ${this.homeService.getExperimenterName(metadata.creator)}
              </div>
              ${template.visibility === Visibility.PUBLIC
                ? html`<div class="chip">Public</div>`
                : nothing}
            </div>
          </div>
        </a>
      </div>
    `;
  }

  private getList(): (ExperimentTemplate | CodeBasedTemplate)[] {
    const q = this.searchQuery.toLowerCase().trim();

    if (this.activeTab === TemplateTab.DEFAULT) {
      let list = [...DEFAULT_TEMPLATES];
      if (this.authService.hasResearchTemplateAccess) {
        list = [...list, ...RESEARCH_TEMPLATES];
      }
      if (q) {
        list = list.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q),
        );
      }
      return list;
    }

    let templates = this.homeService.experimentTemplates;

    if (this.activeTab === TemplateTab.OWNED_BY_ME) {
      templates = templates.filter(
        (t) => t.experiment.metadata.creator === this.authService.userEmail,
      );
    } else if (this.activeTab === TemplateTab.SHARED_WITH_ME) {
      templates = templates.filter(
        (t) => t.experiment.metadata.creator !== this.authService.userEmail,
      );
    }

    if (q) {
      templates = templates.filter(
        (t) =>
          t.experiment.metadata.name.toLowerCase().includes(q) ||
          t.experiment.metadata.description.toLowerCase().includes(q),
      );
    }

    // Sort
    templates = [...templates]; // Copy before sort
    // Mapping SortMode to sort logic
    // Using simple sort adaptation
    templates.sort((a, b) => {
      const getVal = (t: ExperimentTemplate) => {
        if (
          this.sortMode === SortMode.NEWEST ||
          this.sortMode === SortMode.OLDEST
        ) {
          const d = t.experiment.metadata.dateModified;
          // Handle Timestamp or date string or number
          if (typeof d === 'object' && 'seconds' in d)
            return (d as {seconds: number}).seconds;
          return new Date(d).getTime();
        }
        return t.experiment.metadata.name.toLowerCase();
      };

      const valA = getVal(a);
      const valB = getVal(b);

      if (this.sortMode === SortMode.NEWEST)
        return (valB as number) - (valA as number);
      if (this.sortMode === SortMode.OLDEST)
        return (valA as number) - (valB as number);
      if (this.sortMode === SortMode.ALPHA_ASC)
        return String(valA).localeCompare(String(valB));
      if (this.sortMode === SortMode.ALPHA_DESC)
        return String(valB).localeCompare(String(valA));
      return 0;
    });

    return templates;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'template-gallery': TemplateGallery;
  }
}
