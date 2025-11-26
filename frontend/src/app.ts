import './pair-components/button';

import './components/admin/admin_dashboard';
import './components/experiment_builder/experiment_builder';
import './components/experiment_dashboard/experiment_dashboard';
import './components/gallery/home_gallery';
import './components/header/header';
import './components/login/login';
import './components/participant_view/cohort_landing';
import './components/participant_view/participant_view';
import './components/settings/settings';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from './core/core';
import {AnalyticsService} from './services/analytics.service';
import {AuthService} from './services/auth.service';
import {HomeService} from './services/home.service';
import {Pages, RouterService} from './services/router.service';
import {SettingsService} from './services/settings.service';
import {PresenceService} from './services/presence.service';

import {ColorMode} from './shared/types';

import {styles} from './app.scss';

/** App main component. */
@customElement('deliberation-lab')
export class App extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly presenceService = core.getService(PresenceService);

  override connectedCallback() {
    super.connectedCallback();
  }

  private renderPageContent() {
    const params = this.routerService.activeRoute.params;

    switch (this.routerService.activePage) {
      case Pages.HOME:
        if (!this.authService.isExperimenter) {
          return this.render403();
        }
        return html`
          <page-header></page-header>
          <quick-start-gallery></quick-start-gallery>
          <home-gallery></home-gallery>
        `;
      case Pages.ADMIN:
        return html`
          <page-header></page-header>
          <div class="content">
            <admin-dashboard></admin-dashboard>
          </div>
        `;
      case Pages.SETTINGS:
        return html`
          <page-header></page-header>
          <div class="content info">
            <settings-page .showAccount=${true}></settings-page>
          </div>
        `;
      case Pages.EXPERIMENT:
        if (!this.authService.isExperimenter) {
          return this.render403();
        }
        // Update viewed experiments for current experimenter
        this.authService.updateViewedExperiments(params['experiment']);

        return html` <experiment-dashboard></experiment-dashboard> `;
      case Pages.EXPERIMENT_CREATE:
        if (!this.authService.isExperimenter) {
          return this.render403();
        }
        return html`
          <page-header></page-header>
          <experiment-builder></experiment-builder>
        `;
      case Pages.PARTICIPANT:
        this.presenceService.setupPresence(
          this.routerService.activeRoute.params['experiment'],
          this.routerService.activeRoute.params['participant'],
        );

        return html`
          <page-header></page-header>
          <participant-view></participant-view>
        `;
      case Pages.PARTICIPANT_STAGE:
        // This ensures backwards compatibility
        // from when PARTICIPANT_STAGE was a different route than PARTICIPANT
        this.routerService.navigate(Pages.PARTICIPANT, {
          experiment: params['experiment'],
          participant: params['participant'],
          stage: params['stage'],
        });
        return nothing;
      case Pages.PARTICIPANT_JOIN_COHORT:
        return html`
          <page-header></page-header>
          <cohort-landing></cohort-landing>
        `;
      default:
        return this.render404();
    }
  }

  private render404(message = 'Page not found') {
    return html`<div class="content">404: ${message}</div>`;
  }

  private render403() {
    const renderLogoutButton = () => {
      if (!this.authService.authenticated) return nothing;
      return html`
        <div class="action-buttons">
          <pr-button
            color="error"
            variant="outlined"
            @click=${() => {
              this.authService.signOut();
            }}
          >
            Log out
          </pr-button>
        </div>
      `;
    };

    return html`
      <div class="error-wrapper">
        <div class="error">
          <div>Participants do not have access to this page.</div>
          <div>
            If you are a researcher, contact the owner(s) of this deployment and
            have them add your email address to the allowlist.
          </div>
          ${renderLogoutButton()}
        </div>
      </div>
    `;
  }

  override render() {
    if (
      !this.authService.authenticated &&
      !this.routerService.isParticipantPage &&
      this.routerService.activeRoute.params['experiment'] === undefined
    ) {
      // Render login screen if relevant after initial auth check
      return html`
        <div class="app-wrapper mode--${this.settingsService.colorMode}">
          <div class="content login">
            ${this.authService.initialAuthCheck
              ? html`<login-page></login-page>`
              : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="app-wrapper mode--${this.settingsService.colorMode}">
        <main>
          <div class="content-wrapper">${this.renderPageContent()}</div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'deliberation-lab': App;
  }
}
