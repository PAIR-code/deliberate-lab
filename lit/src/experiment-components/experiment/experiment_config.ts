import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "../info/info_config";
import "../mediators/mediator_config";
import "../payout/payout_config";
import "../reveal/reveal_config";
import "../survey/survey_config";
import "../tos/tos_config";

import "@material/web/checkbox/checkbox.js";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { InfoConfigService } from "../../services/config/info_config_service";
import { MediatorConfigService } from "../../services/config/mediator_config_service";
import { PayoutConfigService } from "../../services/config/payout_config_service";
import { RevealConfigService } from "../../services/config/reveal_config_service";
import {
  SurveyConfigService
} from "../../services/config/survey_config_service";
import { TOSConfigService } from "../../services/config/tos_config_service";

import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { ChatKind, StageKind } from "@llm-mediation-experiments/utils";
import {
  STAGE_DESCRIPTION_CHAT,
  STAGE_DESCRIPTION_CHAT_SIMPLE,
  STAGE_DESCRIPTION_INFO,
  STAGE_DESCRIPTION_PAYOUT,
  STAGE_DESCRIPTION_PROFILE,
  STAGE_DESCRIPTION_REVEAL,
  STAGE_DESCRIPTION_SURVEY,
  STAGE_DESCRIPTION_TOS,
  STAGE_DESCRIPTION_VOTE,
} from "../../shared/constants";
import { LAS_DESCRIPTION, LAS_ID } from "../../shared/lost_at_sea/constants";
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
  private readonly payoutConfig = core.getService(PayoutConfigService);
  private readonly revealConfig = core.getService(RevealConfigService);
  private readonly surveyConfig = core.getService(SurveyConfigService);
  private readonly tosConfig = core.getService(TOSConfigService);

  private readonly authService = core.getService(AuthService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>Sorry, participants cannot create experiments!</div>`;
    }

    return html`
      <div class="stages-wrapper">
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

    const updateCurrentStageDescription = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateStageDescription(value);
    }

    const updateCurrentStagePopupText = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateStagePopupText(value);
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
      
      <pr-textarea
        label="Info icon pop-up text"
        placeholder="Info icon pop-up text (markdown supported)"
        variant="outlined"
        .value=${this.experimentConfig.currentStage?.popupText ?? ""}
        @input=${updateCurrentStagePopupText}
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
      case StageKind.Payout:
        this.payoutConfig.reset();
        this.payoutConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(StageKind.Payout, STAGE_DESCRIPTION_PAYOUT)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
          <payout-config></payout-config>
        `;
      case StageKind.Reveal:
        this.revealConfig.reset();
        this.revealConfig.stage = currentStage;
        return html`
          ${this.renderStageInfo(
          StageKind.Reveal, STAGE_DESCRIPTION_REVEAL)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
          <reveal-config></reveal-config>
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

  private renderGameInfo(game: string | undefined) {
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

    const handleGroupCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsExperimentGroup(checked);
    };

    const handleMultiPartCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsMultiPart(checked);
    };

    const handleGroupName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateGroupName(value);
    }

    const handleGroupNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumExperiments(num);
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

      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox id="isExperimentGroup" touch-target="wrapper"
            .checked=${this.experimentConfig.isGroup}
            @change=${handleGroupCheckbox}
          ></md-checkbox>
          <label for="isExperimentGroup">
            <div>Create a group of experiments</div>
            <div class="subtitle">The experiment group options allow you to create a group of experiments with the same configuration.</div>
          </label>
        </div>
      </div>

      ${this.experimentConfig.isGroup
        ? html`
              <div class="group-container">
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
                      .value=${this.experimentConfig.numExperiments}
                      @input=${handleGroupNum}
                    />
                  </div>
              </div>

                <div class="checkbox-input">
                  <md-checkbox id="isExperimentGroup" touch-target="wrapper"
                    .checked=${this.experimentConfig.isMultiPart}
                    @change=${handleMultiPartCheckbox}
                  ></md-checkbox>
                  <label for="isExperimentGroup">
                    <div>Create a muti-part experiment</div>
                    <div class="subtitle">
                        This will add a "lobby" stage; move the stage to divide your experiment into two parts. A lobby experiment will be created for the first part. You can redirect people to the second experiment.
                    </div>
                  </label>
                </div>
              </div>
          `
        : ''}
    `;
  }

  private renderBottomActionButtons() {
    const createExperiments = async () => {
      const experiments = this.experimentConfig.getExperiments() || [];
      for (let i = 0; i < experiments.length; i++) {
        const { name, stages, numberOfParticipants, group } = experiments[i];

        const experiment = await this.experimenterService.createExperiment(
          name, stages, numberOfParticipants, group
        );

        // Navigate if this is the last created experiment.
        if (i === experiments.length - 1) {
          if (group) {
            this.routerService.navigate(
              Pages.EXPERIMENT_GROUP,
              { "experiment_group": group }
            );
          } else {
            this.routerService.navigate(
              Pages.EXPERIMENT,
              { "experiment": experiment.id }
            );
          }
        }
      }

      this.experimentConfig.reset();
    }

    const onCreateExperiment = async () => {
      const errors = this.experimentConfig.getExperimentErrors();
      if (errors.length > 0) {
        console.log(errors);
        return;
      }
      createExperiments();
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
