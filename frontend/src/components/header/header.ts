import '../../pair-components/button';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {Pages, RouterService} from '../../services/router.service';

import {styles} from './header.scss';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const headerClasses = classMap({
      'header': true,
      'banner': this.isBanner(),
    });

    return html`
      <div class=${headerClasses}>
        <div class="left">
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">${this.renderActions()}</div>
      </div>
    `;
  }

  private isBanner() {
    const activePage = this.routerService.activePage;
    return this.experimentManager.isEditing
      || activePage === Pages.PARTICIPANT
      || activePage === Pages.PARTICIPANT_STAGE
      || activePage === Pages.PARTICIPANT_JOIN_COHORT;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.HOME:
        return 'Home';
      case Pages.SETTINGS:
        return 'Settings';
      case Pages.EXPERIMENT:
        return this.renderExperimentTitle();
      case Pages.EXPERIMENT_CREATE:
        return 'New experiment';
      case Pages.PARTICIPANT_JOIN_COHORT:
        return 'Previewing experiment cohort';
      case Pages.PARTICIPANT:
        return 'Previewing as participant';
      case Pages.PARTICIPANT_STAGE:
        return 'Previewing as participant';
      default:
        return '';
    }
  }

  private renderExperimentTitle() {
    const title = this.experimentService.experimentName;
    if (this.experimentManager.isEditing) {
      return `Editing: ${title}`
    } else {
      return title;
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.EXPERIMENT_CREATE:
        return html`
          <pr-button variant="default" disabled>Save as template</pr-button>
          <pr-button
            ?loading=${this.experimentEditor.isWritingExperiment}
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
      case Pages.EXPERIMENT:
        if (this.experimentManager.isEditing) {
          return html`
            <pr-button
              color="tertiary"
              variant="default"
              @click=${() => { this.experimentManager.setIsEditing(false) }}
            >
              Cancel
            </pr-button>
            <pr-button
              color="tertiary"
              variant="tonal"
              @click=${() => { this.experimentManager.setIsEditing(false, true) }}
            >
              Save
            </pr-button>
          `;
        }
        return html`
          <pr-icon-button
            icon="edit"
            color="primary"
            variant="neutral"
            ?disabled=${this.experimentManager.getNumParticipants() > 0}
            @click=${() => { this.experimentManager.setIsEditing(true); }}
          >
          </pr-icon-button>
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
