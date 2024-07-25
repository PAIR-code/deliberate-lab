import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { Experiment } from '@llm-mediation-experiments/utils';
import { convertUnifiedTimestampToDate } from '../../shared/utils';

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./experiment_card.scss";

/** Experiment card component */
@customElement("experiment-card")
export class ExperimentCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() experiment: Experiment|null = null;
  // Whether to show properties that are the same across the group.
  @property() showGroup: boolean = true;

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimenterService = core.getService(ExperimenterService);

  override render() {
    if (this.experiment === null || !this.authService.isExperimenter) {
      return nothing;
    }

    const handleClick = () => {
      this.routerService.navigate(
        Pages.EXPERIMENT,
        { "experiment": this.experiment!.id }
      );
      this.authService.setEditPermissions(false);
    }

    const participantCompletedCount = () => {
      let numCompleted = 0;
      for (const participant of Object.values(this.experiment!.participants)) {
        if (participant.completedExperiment) {
          numCompleted += 1;
        }
      }
      return numCompleted;
    }

    const participantProgressCount = () => {
      // Only counts if started and NOT completed
      let numStarted = 0;
      for (const participant of Object.values(this.experiment!.participants)) {
        if (participant.acceptTosTimestamp && !participant.completedExperiment) {
          numStarted += 1;
        }
      }
      return numStarted;
    }

    const participantProgressRatio = () => {
      return participantProgressCount() / this.experiment!.numberOfParticipants;
    }

    const participantCompletedRatio = () => {
      return participantCompletedCount() / this.experiment!.numberOfParticipants;
    }

    const renderGroupMetadata = () => {
      if (this.showGroup) {
        return html`
        <div class="action-buttons">
          
        <div class="label">
          <div>${this.experiment!.author.displayName}</div>
          <small>${convertUnifiedTimestampToDate(this.experiment!.date)}</small>
        </div>
      </div>`;
      }
    }

    const renderParticipantProgressBar = () =>  {
      if (!this.experiment!.numberOfParticipants) {
        return;
      }
      
      return html`<pr-tooltip
            text="${participantCompletedCount()} completed, ${participantProgressCount()} in progress"
            position="BOTTOM_START"
          >
            <div class="progress-bar">
              <div
                class="progress completed"
                style="width: calc(100% * ${participantCompletedRatio()})"
              >
              </div>
              <div
                class="progress in-progress"
                style="width: calc(100% * .5 * ${participantProgressRatio()})"
              >
              </div>
            </div>`;
    }

    return html`
      <div class="header">
        <div>
          <h3>${this.experiment.name}</h3>
          <div class="label"><small>${this.experiment.id}</small></div>
        </div>
        <div>
          <pr-tooltip text="View experiment" position="TOP_END">
            <pr-icon-button
              icon="arrow_forward"
              color="secondary"
              variant="default"
              @click=${handleClick}>
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${this.authService.canEdit ? this.renderDeleteButton() : nothing}
      </div>
      <p>${this.experiment.numberOfParticipants} participants</p>
      ${this.renderGroup()}
      <p class="label">${this.experiment.description}</p>
      ${renderGroupMetadata()}
      ${renderParticipantProgressBar()}
     </div>
    `;
  }

  private renderGroup() {
    if (!this.experiment || !this.experiment.group || !this.showGroup) {
      return nothing;
    }

    const navigateToGroup = () => {
      if (this.experiment!.group) {
        this.routerService.navigate(
          Pages.EXPERIMENT_GROUP,
          { "experiment_group": this.experiment!.group }
        );
        this.authService.setEditPermissions(false);
      }
    };

    return html`
      <div class="field">Group:
        <div class="chip secondary" role="button" @click=${navigateToGroup}>
          ${this.experiment.group}
        </div>
      </div>
    `;
  }

  private renderDeleteButton() {
    const handleDelete = () => {
      this.experimenterService.deleteExperiment(this.experiment!.id);
    };

    return html`
      <pr-tooltip text="Delete experiment" position="TOP_END">
        <pr-icon-button
          icon="delete"
          color="error"
          variant="default"
          @click=${handleDelete}>
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-card": ExperimentCard;
  }
}
