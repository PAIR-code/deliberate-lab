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
          ${this.renderBackButton()}
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">${this.renderActions()}</div>
      </div>
    `;
  }

  private isBanner() {
    const activePage = this.routerService.activePage;
    return this.experimentManager.isEditingFull
      || activePage === Pages.PARTICIPANT
      || activePage === Pages.PARTICIPANT_STAGE
      || activePage === Pages.PARTICIPANT_JOIN_COHORT;
  }

  private renderBackButton() {
    const activePage = this.routerService.activePage;
    const params = this.routerService.activeRoute.params;

    if (activePage == Pages.HOME) {
      return nothing;
    }

    const handleClick = () => {
      switch (activePage) {
        case Pages.SETTINGS:
          this.routerService.navigate(Pages.HOME);
          break;
        case Pages.EXPERIMENT:
          this.routerService.navigate(Pages.HOME);
          break;
        case Pages.EXPERIMENT_CREATE:
          this.routerService.navigate(Pages.HOME);
          break;
        case Pages.PARTICIPANT_JOIN_COHORT:
          this.routerService.navigate(Pages.EXPERIMENT, params);
          break;
        case Pages.PARTICIPANT:
          this.routerService.navigate(Pages.EXPERIMENT, params);
          break;
        case Pages.PARTICIPANT_STAGE:
          this.routerService.navigate(Pages.EXPERIMENT, params);
          break;
        default:
          break;
      }
    };

    return html`
      <pr-icon-button
        color="neutral"
        icon="arrow_back"
        variant="default"
        @click=${handleClick}
      >
      </pr-icon-button>
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
    if (this.experimentManager.isEditingFull) {
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
        if (this.experimentManager.isEditingFull) {
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
            icon="settings"
            color="neutral"
            variant="default"
            @click=${() => { this.experimentManager.setIsEditingSettingsDialog(true); }}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="edit"
            color="primary"
            variant="default"
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
