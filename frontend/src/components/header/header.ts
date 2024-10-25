import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../../components/experiment_builder/experiment_builder_nav';
import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ButtonClick, AnalyticsService} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  getParticipantName,
  getParticipantStatusDetailText,
} from '../../shared/participant.utils';

import {styles} from './header.scss';
import {ChatStageConfig, ParticipantStatus} from '@deliberation-lab/utils';

/** Header component for app pages */
@customElement('page-header')
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const headerClasses = classMap({
      header: true,
      banner: this.isBanner(),
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
    return (
      this.experimentManager.isEditingFull ||
      activePage === Pages.PARTICIPANT ||
      activePage === Pages.PARTICIPANT_STAGE ||
      activePage === Pages.PARTICIPANT_JOIN_COHORT
    );
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
          this.routerService.navigate(Pages.EXPERIMENT, {
            experiment: params['experiment'],
          });
          break;
        case Pages.PARTICIPANT:
          this.routerService.navigate(Pages.EXPERIMENT, {
            experiment: params['experiment'],
            participant: params['participant'],
          });
          break;
        case Pages.PARTICIPANT_STAGE:
          const stageId = this.routerService.activeRoute.params['stage'];
          const stage = this.experimentService.getStage(
            stageId
          ) as ChatStageConfig;
          if (
            stage.mediators &&
            stage.mediators.length > 0 &&
            !stage.muteMediators!
          ) {
            const isConfirmed = window.confirm(
              `Agents will still respond to new messages. Are you sure you want to go back without muting the agents first?`
            );
            if (!isConfirmed) return;
          }
          this.routerService.navigate(Pages.EXPERIMENT, {
            experiment: params['experiment'],
          });
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
        'You may have unsaved changes. Are you sure you want to exit?'
      );
      if (!isConfirmed) return;
    }
    this.experimentManager.setIsEditing(false);
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;
    const profile = this.participantService.profile;

    const renderParticipantProfileBanner = (profile: any) => {
      if (!profile) return;

      const detailText =
        getParticipantStatusDetailText(profile) ?? getStageDetailText();
      return `Previewing as: ${
        profile.avatar ? profile.avatar : ''
      } ${getParticipantName(profile)}. ${detailText}`;
    };

    const getStageDetailText = () => {
      const stageId = this.routerService.activeRoute.params['stage'];
      const stage = this.experimentService.getStage(stageId);
      if (!stage || !profile) return '';

      const isWaiting = this.cohortService.isStageWaitingForParticipants(
        stage.id
      );
      const detailText = isWaiting
        ? '⏸️ This participant currently sees a wait stage; they are waiting for others in the cohort to catch up.'
        : '';
      return detailText;
    };

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
        return renderParticipantProfileBanner(profile);
      case Pages.PARTICIPANT_STAGE:
        return renderParticipantProfileBanner(profile);
      default:
        return '';
    }
  }

  private renderExperimentTitle() {
    const title = this.experimentService.experiment?.metadata.name ?? '';
    if (this.experimentManager.isEditingFull) {
      return this.experimentManager.isCreator
        ? `Editing: ${title}`
        : `Previewing config: ${title}`;
    } else {
      return title;
    }
  }

  private renderActions() {
    const activePage = this.routerService.activePage;

    // TODO: Refactor pr-buttons into separate render stages
    switch (activePage) {
      case Pages.EXPERIMENT_CREATE:
        return html`
          <pr-button
            color="primary"
            variant="outlined"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => {
              this.experimentEditor.toggleStageBuilderDialog(false);
            }}
          >
            Add stage
          </pr-button>

          <pr-button
            color="primary"
            variant="outlined"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => {
              this.experimentEditor.toggleStageBuilderDialog(true);
            }}
          >
            Load game
          </pr-button>
          <pr-button
            ?loading=${this.experimentEditor.isWritingExperiment}
            ?disabled=${!this.experimentEditor.isValidExperimentConfig}
            @click=${async () => {
              this.analyticsService.trackButtonClick(
                ButtonClick.EXPERIMENT_SAVE_NEW
              );
              const response = await this.experimentEditor.writeExperiment();
              this.experimentEditor.resetExperiment();
              this.routerService.navigate(Pages.EXPERIMENT, {
                experiment: response.id,
              });
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
              @click=${() => {
                this.experimentEditor.toggleStageBuilderDialog(false);
              }}
            >
              Add stage
            </pr-button>

            <pr-button
              color="tertiary"
              variant="outlined"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${() => {
                this.experimentEditor.toggleStageBuilderDialog(true);
              }}
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
              ?disabled=${!this.experimentManager.isCreator}
              @click=${() => {
                this.analyticsService.trackButtonClick(
                  ButtonClick.EXPERIMENT_SAVE_EXISTING
                );
                this.experimentManager.setIsEditing(false, true);
              }}
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
            @click=${() => {
              // Display confirmation dialog
              const isConfirmed = window.confirm(
                'This will create a copy of this experiment. Are you sure you want to proceed?'
              );
              if (!isConfirmed) return;
              this.analyticsService.trackButtonClick(
                ButtonClick.EXPERIMENT_FORK
              );
              this.experimentManager.forkExperiment();
            }}
          >
          </pr-icon-button>
          <pr-tooltip
            text="Experiment creators can edit metadata, and can edit stages if users have not joined the experiment."
            position="BOTTOM_END"
          >
            <pr-icon-button
              icon=${this.experimentManager.isCreator
                ? 'edit_note'
                : 'overview'}
              color="primary"
              variant="default"
              @click=${() => {
                this.analyticsService.trackButtonClick(
                  this.experimentManager.isCreator
                    ? ButtonClick.EXPERIMENT_EDIT
                    : ButtonClick.EXPERIMENT_PREVIEW_CONFIG
                );
                this.experimentManager.setIsEditing(true);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        `;
      case Pages.PARTICIPANT_STAGE:
        return this.renderDebugModeButton();
      default:
        return nothing;
    }
  }

  private renderDebugModeButton() {
    if (!this.authService.isExperimenter) return nothing;

    const debugMode = this.authService.isDebugMode;
    const tooltipText = `
      Turn debug mode ${debugMode ? 'off' : 'on'}.
      (When on, experimenters can debugging statements in participant preview.
      Note that only some stages have debugging statements.)
    `;

    return html`
      <pr-tooltip text=${tooltipText} position="BOTTOM_END">
        <pr-icon-button
          icon=${debugMode ? 'code_off' : 'code'}
          color="neutral"
          variant="default"
          @click=${() => {
            this.authService.setDebugMode(!debugMode);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-header': Header;
  }
}
