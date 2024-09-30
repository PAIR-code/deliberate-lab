import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../../components/experiment_builder/experiment_builder_nav';
import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';

import {getParticipantName} from '../../shared/participant.utils';

import {styles} from './header.scss';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
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
          if (this.experimentManager.isEditingFull) {
            this.closeEditorWithoutSaving();
          } else {
            this.routerService.navigate(Pages.HOME);
          }
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

  private closeEditorWithoutSaving() {
    if (this.experimentManager.isCreator) {
      // Display confirmation dialog
      const isConfirmed = window.confirm(
          "You may have unsaved changes. Are you sure you want to exit?"
      );
      if (!isConfirmed) return;
    }
    this.experimentManager.setIsEditing(false);
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;
    const profile = this.participantService.profile;

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
        return `Previewing as: ${profile ? getParticipantName(profile) : ''}`;
      case Pages.PARTICIPANT_STAGE:
        return `Previewing as: ${profile ? getParticipantName(profile) : ''}`;
      default:
        return '';
    }
  }

  private renderExperimentTitle() {
    const title = this.experimentService.experimentName;
    if (this.experimentManager.isEditingFull) {
      return this.experimentManager.isCreator ? `Editing: ${title}` : `Previewing config: ${title}`;
    } else {
      return title;
    }
  }


  private renderActions() {
    const activePage = this.routerService.activePage;

    switch (activePage) {
      case Pages.EXPERIMENT_CREATE:
        return html`
          <pr-button
            color="primary"
            variant="outlined"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => { this.experimentEditor.toggleStageBuilderDialog(false) }}
          >
            Add stage
          </pr-button>

          <pr-button
            color="primary"
            variant="outlined"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => { this.experimentEditor.toggleStageBuilderDialog(true) }}
          >
            Load game
          </pr-button>
          <pr-button
            ?loading=${this.experimentEditor.isWritingExperiment}
            ?disabled=${!this.experimentEditor.isValidExperimentConfig}
            @click=${async () => {
              const response = await this.experimentEditor.writeExperiment();
              this.experimentEditor.resetExperiment();
              this.routerService.navigate(Pages.EXPERIMENT, {'experiment': response.id});
            }}
          >
            Save experiment
          </pr-button>
        `;
      case Pages.EXPERIMENT:
        if (this.experimentManager.isEditingFull) {
          if (!this.experimentManager.isCreator) return nothing;

          return html`
            <pr-button
              color="tertiary"
              variant="outlined"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${() => { this.experimentEditor.toggleStageBuilderDialog(false) }}
            >
              Add stage
            </pr-button>

            <pr-button
              color="tertiary"
              variant="outlined"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${() => { this.experimentEditor.toggleStageBuilderDialog(true) }}
            >
              Load game
            </pr-button>
            <pr-button
              color="tertiary"
              variant="default"
              @click=${this.closeEditorWithoutSaving}
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
            icon="fork_right"
            color="neutral"
            variant="default"
            @click=${() => { this.experimentManager.forkExperiment(); }}
          >
          </pr-icon-button>
          <pr-tooltip text="Experiment creators can edit metadata, and can edit stages if users have not joined the experiment." position="BOTTOM_END">
            <pr-icon-button
              icon=${this.experimentManager.isCreator ? 'edit_note' : 'overview'}
              color="primary"
              variant="default"
              @click=${() => { this.experimentManager.setIsEditing(true); }}
            >
            </pr-icon-button>
          </pr-tooltip>
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
