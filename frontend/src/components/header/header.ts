import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../../components/experiment_builder/experiment_builder_nav';
import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
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

import {BUG_REPORT_URL, DOCUMENTATION_URL} from '../../shared/constants';
import {
  getParticipantInlineDisplay,
  getParticipantStatusDetailText,
} from '../../shared/participant.utils';
import {
  ChatStageConfig,
  ParticipantProfile,
  ParticipantStatus,
} from '@deliberation-lab/utils';

import {styles} from './header.scss';

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

  @state() isDownloading = false; // used for experiment download

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const isDashboard = this.routerService.activePage === Pages.EXPERIMENT;
    const headerClasses = classMap({
      header: true,
      banner: this.isBanner(),
    });

    return html`
      <div class=${headerClasses}>
        <div class="left">
          ${this.renderBackButton()}
          <h1 class=${isDashboard ? 'short' : ''}>${this.renderTitle()}</h1>
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
      activePage === Pages.PARTICIPANT_JOIN_COHORT
    );
  }

  private renderBackButton() {
    const activePage = this.routerService.activePage;
    const params = this.routerService.activeRoute.params;

    if (activePage === Pages.HOME || activePage === Pages.ADMIN) {
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
        'You may have unsaved changes. Are you sure you want to exit?',
      );
      if (!isConfirmed) return;
    }
    this.experimentManager.setIsEditing(false);
  }

  private renderParticipantProfileBanner(
    profile: ParticipantProfile | undefined,
  ) {
    if (!profile) return;

    const getStageWaitingText = () => {
      const stageId = this.participantService.currentStageViewId ?? '';
      const stage = this.experimentService.getStage(stageId);
      if (!stage || !profile) return '';

      const isWaiting = this.cohortService.isStageInWaitingPhase(stage.id);
      if (isWaiting) {
        return '⏸️ This participant currently sees a wait stage; they are waiting for others in the cohort to catch up.';
      }
      return undefined;
    };

    const detailText = getParticipantStatusDetailText(profile);

    return html`
      Previewing as: ${getParticipantInlineDisplay(profile)}.
      ${detailText.length > 0 ? detailText : getStageWaitingText()}
    `;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;
    const profile = this.participantService.profile;

    switch (activePage) {
      case Pages.HOME:
        return '🕊️ Deliberate Lab';
      case Pages.ADMIN:
        return 'Admin dashboard';
      case Pages.SETTINGS:
        return 'Settings';
      case Pages.EXPERIMENT:
        return this.renderExperimentTitle();
      case Pages.EXPERIMENT_CREATE:
        return 'New experiment';
      case Pages.PARTICIPANT_JOIN_COHORT:
        return 'Previewing experiment cohort';
      case Pages.PARTICIPANT:
        const stageId = this.participantService.currentStageViewId ?? '';
        const stage = this.experimentService.getStage(stageId);
        if (!stage || !profile) return '';
        return getParticipantStatusDetailText(
          profile,
          this.cohortService.isStageInWaitingPhase(stage.id),
          `Previewing as: ${getParticipantInlineDisplay(profile)}.`,
        );
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
      case Pages.HOME:
        return html`
          <pr-tooltip text="Read the documentation" position="BOTTOM_END">
            <pr-icon-button
              icon="article"
              color="secondary"
              variant="default"
              @click=${() => {
                // TODO: Add Analytics tracking for documentation click
                window.open(DOCUMENTATION_URL, '_blank');
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Report a bug" position="BOTTOM_END">
            <pr-icon-button
              icon="bug_report"
              color="secondary"
              variant="default"
              @click=${() => {
                // TODO: Add Analytics tracking for bug report click
                window.open(BUG_REPORT_URL, '_blank');
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="View experimenter settings" position="BOTTOM_END">
            <pr-icon-button
              icon="settings"
              color="secondary"
              variant="default"
              @click=${() => {
                this.routerService.navigate(Pages.SETTINGS);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        `;
      case Pages.EXPERIMENT_CREATE:
        const errors = this.experimentEditor.getExperimentConfigErrors();
        return html`
          ${errors.length === 0
            ? nothing
            : html` <div class="error">⚠️ ${errors.join(', ')}</div> `}
          <pr-button
            ?loading=${this.experimentEditor.isWritingExperiment}
            ?disabled=${errors.length > 0}
            @click=${async () => {
              this.analyticsService.trackButtonClick(
                ButtonClick.EXPERIMENT_SAVE_NEW,
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
                  ButtonClick.EXPERIMENT_SAVE_EXISTING,
                );
                this.experimentManager.setIsEditing(false, true);
              }}
            >
              Save
            </pr-button>
          `;
        }
        return html`
          ${this.renderExperimentDownloadButton()}
          ${this.renderExperimentForkButton()}
          ${this.renderExperimentEditButton()}
          ${this.renderExperimentDeleteButton()}
        `;
      case Pages.PARTICIPANT:
        return this.renderDebugModeButton();
      default:
        return nothing;
    }
  }

  private renderExperimentDownloadButton() {
    const onClick = async () => {
      this.isDownloading = true;
      await this.experimentManager.downloadExperiment();
      this.isDownloading = false;
    };

    return html`
      <pr-tooltip text="Download experiment data" position="BOTTOM_END">
        <pr-icon-button
          icon="download"
          color="secondary"
          size="small"
          variant="default"
          ?loading=${this.isDownloading}
          @click=${onClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderExperimentForkButton() {
    const onClick = () => {
      // Display confirmation dialog
      const isConfirmed = window.confirm(
        'This will create a copy of this experiment. Are you sure you want to proceed?',
      );
      if (!isConfirmed) return;
      this.analyticsService.trackButtonClick(ButtonClick.EXPERIMENT_FORK);
      this.experimentManager.forkExperiment();
    };

    return html`
      <pr-tooltip text="Fork experiment" position="BOTTOM_END">
        <pr-icon-button
          icon="fork_right"
          color="secondary"
          size="small"
          variant="default"
          @click=${onClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderExperimentEditButton() {
    const tooltip = `
      Experiment creators can edit metadata any time
      + can edit stages if users have not joined the experiment.`;

    const onClick = () => {
      this.analyticsService.trackButtonClick(
        this.experimentManager.isCreator
          ? ButtonClick.EXPERIMENT_EDIT
          : ButtonClick.EXPERIMENT_PREVIEW_CONFIG,
      );
      this.experimentManager.setIsEditing(true);
    };

    return html`
      <pr-tooltip text=${tooltip} position="BOTTOM_END">
        <pr-icon-button
          icon="settings"
          color="secondary"
          size="small"
          variant="default"
          @click=${onClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderExperimentDeleteButton() {
    return html`
      <pr-tooltip text="Delete experiment" position="BOTTOM_END">
        <pr-icon-button
          icon="delete"
          color="error"
          variant="default"
          size="small"
          ?disabled=${!this.experimentManager.isCreator}
          @click=${() => {
            const isConfirmed = window.confirm(
              `Are you sure you want to delete this experiment?`,
            );
            if (!isConfirmed) return;

            this.analyticsService.trackButtonClick(
              ButtonClick.EXPERIMENT_DELETE,
            );
            this.experimentManager.deleteExperiment();
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
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
