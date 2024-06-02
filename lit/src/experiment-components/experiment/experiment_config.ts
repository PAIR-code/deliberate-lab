import "../../pair-components/button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "../info/info_config";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { InfoConfigService } from "../../services/config/info_config_service";

import { AuthService } from "../../services/auth_service";
import { FirebaseService } from "../../services/firebase_service";
import { Pages, RouterService } from "../../services/router_service";

import {
  STAGE_DESCRIPTION_INFO
} from "../../shared/constants";
import { StageConfig, StageKind } from "../../shared/types";

import { styles } from "./experiment_config.scss";

/** Experiment config page component */
@customElement("experiment-config")
export class ExperimentConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly infoConfig = core.getService(InfoConfigService);

  private readonly authService = core.getService(AuthService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>Sorry, participants cannot create experiments!</div>`;
    }

    return html`
      ${this.renderTopActionButtons()}
      <div class="stages-wrapper">
        ${this.renderNav()}
        <div class="current-stage">
          ${this.renderCurrentStage()}
        </div>
      </div>
      ${this.experimentConfig.getExperimentErrors().map(error =>
        html`<div class="error">Error: ${error}</div>`
      )}
      ${this.renderBottomActionButtons()}
    `;
  }

  private renderCurrentStage() {
    const currentStage = this.experimentConfig.currentStage;
    switch (currentStage?.kind) {
      case StageKind.Info:
        this.infoConfig.reset();
        this.infoConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(StageKind.Info, STAGE_DESCRIPTION_INFO)}
          <info-config></info-config>
        `;
      default:
        return this.renderMetadata();
    }
  }

  private renderStageInfo(chip: string, content: string) {
    return html`
      <div class="stage-info">
        <div class="stage-chip">${chip}</div>
        <div class="stage-description">${content}</div>
      </div>
    `;
  }

  private renderMetadata() {
    const handleName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateName(value);
    };

    const handleNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumParticipants(num);
    };

    return html`
      <pr-textarea
        label="Experiment name"
        placeholder="Name of experiment"
        variant="outlined"
        .value=${this.experimentConfig.name}
        @input=${handleName}
      >
      </pr-textarea>
      <div class="number-input">
        <label for="num">Number of participants</label>
        <input
          type="number"
          id="num"
          name="numParticipants"
          min="0"
          .value=${this.experimentConfig.numParticipants}
          @input=${handleNum}
        />
      </div>
    `;
  }

  private renderNav() {
    const settingsClasses = classMap({
      "nav-item": true,
      "selected": this.experimentConfig.currentStage === null
    });

    const handleClick = () => {
      this.experimentConfig.setCurrentStageIndex(-1);
    };

    return html`
      <div class="stages-nav">
        <div class=${settingsClasses} role="button" @click=${handleClick}>
          Settings
        </div>
        ${this.experimentConfig.stages.map(
          (stage, index) => this.renderStageNavItem(stage, index)
        )}
      </div>
    `;
  }

  private renderStageNavItem(stage: StageConfig, index: number) {
    const classes = classMap({
      "nav-item": true,
      "selected": this.experimentConfig.currentStageIndex === index
    });

    const handleClick = () => {
      this.experimentConfig.setCurrentStageIndex(index);
    };

    return html`
      <div class=${classes} role="button" @click=${handleClick}>
        ${index + 1}. ${stage.name}
      </div>
    `;
  }

  private renderTopActionButtons() {
    const onAddInfoClick = () => {
      this.experimentConfig.addInfoConfig();
      this.experimentConfig.setCurrentStageIndex(
        this.experimentConfig.stages.length - 1
      );
    }

    return html`
      <div class="buttons-wrapper">
        <pr-button variant="default" @click=${onAddInfoClick}>
          + Add stage
        </pr-button>
      </div>
    `;
  }

  private renderBottomActionButtons() {
    const onCreateClick = async () => {
      if (this.experimentConfig.getExperimentErrors().length > 0) {
        return;
      }

      const { name, stages, numberOfParticipants } =
        this.experimentConfig.getExperiment();

      await this.firebaseService.createExperiment(
        name, stages, numberOfParticipants
      );

      this.experimentConfig.reset();
      this.routerService.navigate(Pages.HOME);
    }

    const onClearClick = () => {
      this.experimentConfig.reset();
    }

    const hasErrors = this.experimentConfig.getExperimentErrors().length > 0;
    const tooltipText = hasErrors ? "Resolve errors to create experiment" : "";

    return html`
      <div class="buttons-wrapper bottom">
        <pr-button variant="default" @click=${onClearClick}>
          Clear
        </pr-button>
        <pr-tooltip text=${tooltipText} position="TOP_END">
          <pr-button @click=${onCreateClick}>
            Create experiment
          </pr-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config": ExperimentConfig;
  }
}
