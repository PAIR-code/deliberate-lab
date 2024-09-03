import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {styles} from './header.scss';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly homeService = core.getService(HomeService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      ${this.renderAuthBanner()}
      <div class="header">
        <div class="left">
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">${this.renderActions()}</div>
      </div>
    `;
  }

  private renderAuthBanner() {
    return html`
      <div class="banner">
        <div class="left">
          <div>Test banner</div>
        </div>
      </div>
    `;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.HOME:
        return 'Home';
      case Pages.SETTINGS:
        return 'Settings';
      case Pages.EXPERIMENT_CREATE:
        return 'New experiment';
      default:
        return '';
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.EXPERIMENT_CREATE:
        return html`
          <pr-button variant="default">Save as template</pr-button>
          <pr-button @click=${() => {
            this.homeService.writeExperiment();
          }}>
            Save experiment
          </pr-button>
        `;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-header': Header;
  }
}
