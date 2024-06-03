import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/menu";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "../info/info_config";
import "../tos/tos_config";
import "../survey/survey_config";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { InfoConfigService } from "../../services/config/info_config_service";
import { TOSConfigService } from "../../services/config/tos_config_service";
import {
  SurveyConfigService
} from "../../services/config/survey_config_service";

import { AuthService } from "../../services/auth_service";
import { FirebaseService } from "../../services/firebase_service";
import { Pages, RouterService } from "../../services/router_service";

import {
  STAGE_DESCRIPTION_INFO,
  STAGE_DESCRIPTION_TOS,
  STAGE_DESCRIPTION_SURVEY,
  STAGE_DESCRIPTION_PROFILE,
  STAGE_DESCRIPTION_CHAT,
  STAGE_DESCRIPTION_VOTE,
  STAGE_DESCRIPTION_REVEAL
} from "../../shared/constants";
import { StageConfig, StageKind } from "@llm-mediation-experiments/utils";
import {
  createInfoStage,
  createProfileStage,
  createSurveyStage,
  createVoteForLeaderStage,
} from "../../shared/utils";

import { styles } from "./experiment_config.scss";

/** Experiment config page component */
@customElement("experiment-config")
export class ExperimentConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly infoConfig = core.getService(InfoConfigService);
  private readonly tosConfig = core.getService(TOSConfigService);
  private readonly surveyConfig = core.getService(SurveyConfigService);

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

  private renderCurrentStageNameField() {
    const updateCurrentStageName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateStageName(value);
    }

    return html`
      <pr-textarea
        label="Stage name"
        placeholder="Stage name"
        variant="outlined"
        .value=${this.experimentConfig.currentStage?.name ?? ""}
        @input=${updateCurrentStageName}
      >
      </pr-textarea>
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
      case StageKind.TermsOfService:
        this.tosConfig.reset();
        this.tosConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(
            StageKind.TermsOfService, STAGE_DESCRIPTION_TOS)}
          <tos-config></tos-config>
        `;
      case StageKind.TakeSurvey:
        this.surveyConfig.reset();
        this.surveyConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(
            StageKind.TakeSurvey, STAGE_DESCRIPTION_SURVEY)}
          <survey-config></survey-config>
        `;
      case StageKind.SetProfile:
        return html`
          ${this.renderStageInfo(
            StageKind.SetProfile, STAGE_DESCRIPTION_PROFILE)}
          ${this.renderCurrentStageNameField()}
        `;
      case StageKind.VoteForLeader:
        return html`
          ${this.renderStageInfo(
            StageKind.VoteForLeader, STAGE_DESCRIPTION_VOTE)}
          ${this.renderCurrentStageNameField()}
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
      "main-nav": true,
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
      "main-nav": true,
      "selected": this.experimentConfig.currentStageIndex === index
    });

    const handleClick = () => {
      this.experimentConfig.setCurrentStageIndex(index);
    };

    const handleMoveUp = () => {
      this.experimentConfig.moveStageUp(index);
    }

    const handleMoveDown = () => {
      this.experimentConfig.moveStageDown(index);
    }

    return html`
      <div class=${classes}>
        <div class="label" role="button" @click=${handleClick}>
          ${index + 1}. ${stage.name}
        </div>
        <div class="buttons">
          <pr-icon-button
            color="neutral"
            icon="arrow_upward"
            padding="small"
            size="small"
            variant="default"
            ?disabled=${index === 0}
            @click=${handleMoveUp}
          >
          </pr-icon-button>
          <pr-icon-button
            color="neutral"
            icon="arrow_downward"
            padding="small"
            size="small"
            variant="default"
            ?disabled=${index === this.experimentConfig.stages.length - 1}
            @click=${handleMoveDown}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }

  private renderTopActionButtons() {
    const onAddInfoClick = () => {
      this.experimentConfig.addStage(createInfoStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    const onAddSurveyClick = () => {
      this.experimentConfig.addStage(createSurveyStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    const onAddProfileClick = () => {
      this.experimentConfig.addStage(
        { kind: StageKind.SetProfile, name: "Set profile" }
      );
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    const onAddVoteClick = () => {
      this.experimentConfig.addStage(
        { kind: StageKind.VoteForLeader, name: "Vote for leader" }
      );
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    return html`
      <div class="buttons-wrapper">
        <pr-menu name="Add stage">
          <div class="nav-item" role="button" @click=${onAddInfoClick}>
            Info stage
          </div>
          <div class="nav-item" role="button" @click=${onAddSurveyClick}>
            Survey stage
          </div>
          <div class="nav-item" role="button" @click=${onAddProfileClick}>
            Profile stage
          </div>
          <div class="nav-item" role="button" @click=${onAddVoteClick}>
            Leader vote stage
          </div>
        </pr-menu>
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
