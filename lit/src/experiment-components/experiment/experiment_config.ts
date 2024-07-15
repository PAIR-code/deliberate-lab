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

import "@material/web/checkbox/checkbox.js";

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
  STAGE_DESCRIPTION_CHAT,
  STAGE_DESCRIPTION_CHAT_SIMPLE,
  STAGE_DESCRIPTION_INFO,
  STAGE_DESCRIPTION_PROFILE,
  STAGE_DESCRIPTION_REVEAL,
  STAGE_DESCRIPTION_SURVEY,
  STAGE_DESCRIPTION_TOS,
  STAGE_DESCRIPTION_VOTE,
} from "../../shared/constants";
import { generateId } from "../../shared/utils";
import { LAS_ID, LAS_DESCRIPTION } from "../../shared/lost_at_sea/constants";
import { isLostAtSeaGameStage } from "../../shared/lost_at_sea/utils";

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

  private numExperiments = 1;

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

    const updateCurrentStageDescription = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateStageDescription(value);
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
      
      <pr-textarea
        label="Stage description"
        placeholder="Stage description"
        variant="outlined"
        .value=${this.experimentConfig.currentStage?.description ?? ""}
        @input=${updateCurrentStageDescription}
      >
      </pr-textarea>
    `;
  }

  private renderCurrentStageRevealField() {
    const updateCurrentStageReveal = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateStageReveal(checked);
    };

    // TODO: Replace generated id with actual stage id (once field is added)
    const id = `${generateId()}-reveal`;
    return html`
      <div class="checkbox-input">
        <md-checkbox id=${id} touch-target="wrapper"
          .checked=${this.experimentConfig.currentStage?.reveal}
          @change=${updateCurrentStageReveal}
        />
        </md-checkbox>
        <label for=${id}>Show results in reveal stage</label>
      </div>
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
          ${this.renderGameInfo(currentStage.game)}
          <info-config></info-config>
        `;
      case StageKind.TermsOfService:
        this.tosConfig.reset();
        this.tosConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(
            StageKind.TermsOfService, STAGE_DESCRIPTION_TOS)}
          ${this.renderGameInfo(currentStage.game)}
          <tos-config></tos-config>
        `;
      case StageKind.TakeSurvey:
        this.surveyConfig.reset();
        this.surveyConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(
            StageKind.TakeSurvey, STAGE_DESCRIPTION_SURVEY)}
          ${this.renderGameInfo(currentStage.game)}
          ${isLostAtSeaGameStage(currentStage) ?
            this.renderCurrentStageRevealField() : nothing}
          <survey-config></survey-config>
        `;
      case StageKind.SetProfile:
        return html`
          ${this.renderStageInfo(
            StageKind.SetProfile, STAGE_DESCRIPTION_PROFILE)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
        `;
      case StageKind.GroupChat:
        this.mediatorConfig.reset();
        this.mediatorConfig.mediators = currentStage.mediators;
        if (currentStage.chatConfig.kind !== ChatKind.ChatAboutItems) {
          return html`
            ${this.renderStageInfo(StageKind.GroupChat, STAGE_DESCRIPTION_CHAT)}
            ${this.renderGameInfo(currentStage.game)}
            <div class="error">${STAGE_DESCRIPTION_CHAT_SIMPLE}</div>
            ${this.renderCurrentStageNameField()}
            <mediators-config></mediators-config>
          `;
        }
        return html`
          ${this.renderStageInfo(
            StageKind.GroupChat, STAGE_DESCRIPTION_CHAT)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
          ${isLostAtSeaGameStage(currentStage) ?
            html`<code>${JSON.stringify(currentStage.chatConfig)}</code>`
            : nothing}
            <mediators-config></mediators-config>
          `;
      case StageKind.VoteForLeader:
        return html`
          ${this.renderStageInfo(
            StageKind.VoteForLeader, STAGE_DESCRIPTION_VOTE)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
        `;
      case StageKind.Reveal:
        return html`
          ${this.renderStageInfo(
            StageKind.Reveal, STAGE_DESCRIPTION_REVEAL)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
        `;
      default:
        return this.renderMetadata();
    }
  }

  private renderDeleteCurrentStage() {
    if (!this.experimentConfig.currentStage ||
      this.experimentConfig.currentStage.kind === StageKind.TermsOfService ||
      this.experimentConfig.currentStage.implicit) {
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

  private renderStageInfo(chip: string, content: string) {
    return html`
      <div class="stage-info">
        <div class="stage-chip">${chip}</div>
        <div class="stage-description">${content}</div>
      </div>
    `;
  }

  private renderGameInfo(game: string|undefined) {
    if (game === LAS_ID) {
      return html`
        <div class="stage-info">
          <div class="stage-chip tertiary">${game}</div>
          <div class="stage-description">${LAS_DESCRIPTION}</div>
        </div>
      `;
    }

    return nothing;
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

    const handleCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsExperimentGroup(checked);
    };

    const handleGroupName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateGroupName(value);
    }

    const handleGroupNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.numExperiments = num;
    };


    return html`
      <pr-textarea
        label="Experiment name"
        placeholder="Name of experiment"
        variant="outlined"
        .value=${this.experimentConfig.name}
        .disabled=${this.experimentConfig.isGroup}
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
      <i>The experiment group options allow you to create a group of experiments with the same configuration.</i>
      <div class="checkbox-input">
        <md-checkbox id="isExperimentGroup" touch-target="wrapper"
          .checked=${this.experimentConfig.isGroup}
          @change=${handleCheckbox}
        />
        </md-checkbox>
        <label for="isExperimentGroup">Create a group of experiments</label>
      </div>
      ${this.experimentConfig.isGroup
        ? html`
              <pr-textarea
                label="Experiment group name"
                placeholder="Prefix of the experiment group"
                variant="outlined"
                .value=${this.experimentConfig.group}
                @input=${handleGroupName}
              >
              </pr-textarea>
              <div class="number-input">
                  <label for="num">Number of experiments</label>
                  <input
                    type="number"
                    id="numExperiments"
                    name="numExperiments"
                    min="1"
                    .value=${this.numExperiments}
                    @input=${handleGroupNum}
                  />
                </div>
          `
        : ''}
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
          🛠️&nbsp; Experiment ${this.experimentConfig.isGroup ? 'group' : ''} settings
        </div>
        <div class="scroll-menu">
        ${this.experimentConfig.stages.map(
          (stage, index) => this.renderStageNavItem(stage, index)
        )}
        </div>
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
    const createSingleExperiment = async (shouldNavigate: boolean = false) => {
      const { name, stages, numberOfParticipants, group } =
        this.experimentConfig.getExperiment();

      const experiment = await this.experimenterService.createExperiment(
        name, stages, numberOfParticipants, group
      );

      this.experimentConfig.reset();
      
      if (shouldNavigate) {
        if (group) {
          this.routerService.navigate(
            Pages.EXPERIMENT_GROUP,
            { "experiment_group": group}
          );
        } else {
          this.routerService.navigate(
            Pages.EXPERIMENT,
            { "experiment": experiment.id }
          );
        }
      }
    }

    const onCreateExperiment = async () => {
      const errors = this.experimentConfig.getExperimentErrors();
      if (errors.length > 0) {
        console.log(errors);
        return;
      }

      for (let i =0; i < this.numExperiments; i++) {
       let shouldNavigate = (i == this.numExperiments - 1);
       createSingleExperiment(shouldNavigate);
      }
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
            ${this.experimentConfig.isGroup ? 'Create experiment group' : 'Create experiment'}
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
