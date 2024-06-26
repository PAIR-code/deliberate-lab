import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/menu";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "../info/info_config";
import "../mediators/mediator_config";
import "../survey/survey_config";
import "../tos/tos_config";
import "./experiment_config_menu";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { InfoConfigService } from "../../services/config/info_config_service";
import { MediatorConfigService } from "../../services/config/mediator_config_service";
import {
  SurveyConfigService
} from "../../services/config/survey_config_service";
import { TOSConfigService } from "../../services/config/tos_config_service";

import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { ChatKind, ExperimentTemplate, StageConfig, StageKind } from "@llm-mediation-experiments/utils";
import {
  MODULE_DESCRIPTION_LAS,
  MODULE_DESCRIPTION_LEADER,
  STAGE_DESCRIPTION_CHAT,
  STAGE_DESCRIPTION_CHAT_SIMPLE,
  STAGE_DESCRIPTION_INFO,
  STAGE_DESCRIPTION_PROFILE,
  STAGE_DESCRIPTION_REVEAL,
  STAGE_DESCRIPTION_SURVEY,
  STAGE_DESCRIPTION_TOS,
  STAGE_DESCRIPTION_VOTE,
} from "../../shared/constants";
import {
  isLostAtSeaModuleStage
} from "../../shared/utils";

import { ExperimenterService } from "../../services/experimenter_service";
import { styles } from "./experiment_config.scss";

/** Experiment config page component */
@customElement("experiment-config")
export class ExperimentConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly infoConfig = core.getService(InfoConfigService);
  private readonly mediatorConfig = core.getService(MediatorConfigService);
  private readonly tosConfig = core.getService(TOSConfigService);
  private readonly surveyConfig = core.getService(SurveyConfigService);

  private readonly authService = core.getService(AuthService);
  private readonly experimenterService = core.getService(ExperimenterService);
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
          ${this.renderDeleteCurrentStage()}
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
          ${isLostAtSeaModuleStage(currentStage) ? this.renderStageInfo(
            "lostAtSeaGame", MODULE_DESCRIPTION_LAS, true) : nothing}
          <survey-config></survey-config>
        `;
      case StageKind.SetProfile:
        return html`
          ${this.renderStageInfo(
            StageKind.SetProfile, STAGE_DESCRIPTION_PROFILE)}
          ${this.renderCurrentStageNameField()}
        `;
      case StageKind.GroupChat:
        this.mediatorConfig.reset();
        this.mediatorConfig.mediators = currentStage.mediators;
        if (currentStage.chatConfig.kind !== ChatKind.ChatAboutItems) {
          return html`
            ${this.renderStageInfo(StageKind.GroupChat, STAGE_DESCRIPTION_CHAT)}
            <div class="error">${STAGE_DESCRIPTION_CHAT_SIMPLE}</div>
            ${this.renderCurrentStageNameField()}
            <mediators-config></mediators-config>
          `;
        }
        return html`
          ${this.renderStageInfo(
            StageKind.GroupChat, STAGE_DESCRIPTION_CHAT)}
          ${isLostAtSeaModuleStage(currentStage) ? this.renderStageInfo(
            "lostAtSeaGame", MODULE_DESCRIPTION_LAS, true) : nothing}
          ${this.renderCurrentStageNameField()}
          ${isLostAtSeaModuleStage(currentStage) ?
            html`<code>${JSON.stringify(currentStage.chatConfig)}</code>`
            : nothing}
          <mediators-config></mediators-config>
          `;
      case StageKind.VoteForLeader:
        return html`
          ${this.renderStageInfo(
            StageKind.VoteForLeader, STAGE_DESCRIPTION_VOTE)}
          ${this.renderStageInfo(
            "leaderModule", MODULE_DESCRIPTION_LEADER, true)}
          ${this.renderCurrentStageNameField()}
        `;
      case StageKind.RevealVoted:
        return html`
          ${this.renderStageInfo(
            StageKind.RevealVoted, STAGE_DESCRIPTION_REVEAL)}
          ${this.renderStageInfo(
            "leaderModule", MODULE_DESCRIPTION_LEADER, true)}
          ${this.renderCurrentStageNameField()}
        `;
      default:
        return this.renderMetadata();
    }
  }

  private renderDeleteCurrentStage() {
    if (!this.experimentConfig.currentStage ||
      this.experimentConfig.currentStage.kind === StageKind.TermsOfService) {
      return nothing;
    }

    const handleDelete = () => {
      this.experimentConfig.deleteStage(
        this.experimentConfig.currentStageIndex);
    };

    return html`
      <div class="buttons-wrapper bottom">
        <pr-button color="error" variant="default" @click=${handleDelete}>
          Delete stage
        </pr-button>
      </div>
    `;
  }

  private renderStageInfo(chip: string, content: string, isModule = false) {
    const chipClasses = classMap({
      "stage-chip": true,
      "tertiary": isModule
    });

    return html`
      <div class="stage-info">
        <div class=${chipClasses}>${chip}</div>
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

    const handleMoveUp = (e: Event) => {
      this.experimentConfig.moveStageUp(index);
      e.stopPropagation();
    }

    const handleMoveDown = (e: Event) => {
      this.experimentConfig.moveStageDown(index);
      e.stopPropagation();
    }

    return html`
      <div class=${classes} role="button" @click=${handleClick}>
        <div class="label">
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

  private renderTemplateItem(template: ExperimentTemplate) {
    const onClick = () => {
      this.experimentConfig.loadTemplate(template.id, template.name);
    };

    return html`
      <div class="template-item" role="button" @click=${onClick}>
        <div>${template.name}</div>
        <div class="subtitle">${template.id}</div>
      </div>
    `;
  }

  private renderTopActionButtons() {
    return html`
      <div class="buttons-wrapper">
        <pr-menu color="secondary" name="Load template">
          <div class="menu-wrapper">
            ${this.experimenterService.templates.length === 0 ?
              html`<div>No templates yet</div>` : nothing}
            ${this.experimenterService.templates.map(
              template => this.renderTemplateItem(template))}
          </div>
        </pr-menu>
        <experiment-config-menu></experiment-config-menu>
      </div>
    `;
  }

  private renderBottomActionButtons() {
    const onCreateExperiment = async () => {
      if (this.experimentConfig.getExperimentErrors().length > 0) {
        return;
      }

      const { name, stages, numberOfParticipants } =
        this.experimentConfig.getExperiment();

      await this.experimenterService.createExperiment(
        name, stages, numberOfParticipants
      );

      this.experimentConfig.reset();
      this.routerService.navigate(Pages.HOME);
    }

    const onCreateTemplate = async () => {
      const { name, stages, numberOfParticipants } =
        this.experimentConfig.getExperiment();

      await this.experimenterService.createTemplate(
        name, stages
      );

      this.experimentConfig.reset();
    }

    const onClear = () => {
      this.experimentConfig.reset();
    }

    const hasErrors = this.experimentConfig.getExperimentErrors().length > 0;
    const tooltipText = hasErrors ? "Resolve errors to create experiment" : "";

    return html`
      <div class="buttons-wrapper bottom">
        <pr-button variant="default" @click=${onClear}>
          Clear
        </pr-button>
        <pr-button variant="tonal" @click=${onCreateTemplate}>
          Create template
        </pr-button>
        <pr-tooltip text=${tooltipText} position="TOP_END">
          <pr-button @click=${onCreateExperiment}>
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
