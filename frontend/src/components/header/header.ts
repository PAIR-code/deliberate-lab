import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {Pages, RouterService} from '../../services/router.service';

import {styles} from './header.scss';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
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
      case Pages.EXPERIMENT:
        return 'Experiment';
      case Pages.EXPERIMENT_CREATE:
        return 'New experiment';
      case Pages.EXPERIMENT_EDIT:
        return 'Edit experiment';
      default:
        return '';
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.EXPERIMENT_CREATE:
        return html`
          <pr-button variant="default" disabled>Save as template</pr-button>
          <pr-button
            ?disabled=${!this.experimentEditor.isValidExperimentConfig}
            @click=${async () => {
              await this.experimentEditor.writeExperiment();
              this.experimentEditor.resetExperiment();
              this.routerService.navigate(Pages.HOME);
            }}
          >
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
