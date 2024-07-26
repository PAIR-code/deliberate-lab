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

import "./experiment_config_actions";
import "./experiment_config_metadata";

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
      <experiment-config-actions></experiment-config-actions>
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
      case StageKind.LostAtSeaSurvey:
        return html`
          ${this.renderStageInfo(StageKind.LostAtSeaSurvey, STAGE_DESCRIPTION_INFO)}
          ${this.renderGameInfo(currentStage.game)}
          ${this.renderCurrentStageNameField()}
          <code>${JSON.stringify(currentStage.questions)}</code>
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
        return html`<experiment-config-metadata></experiment-config-metadata>`;
    }
  }

  private renderStageInfo(chip: string, content: string) {
    return html`
      <div class="stage-info">
        <div class="stage-chip primary">${chip}</div>
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
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config": ExperimentConfig;
  }
}
