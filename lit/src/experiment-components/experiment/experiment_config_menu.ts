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
  MODULE_DESCRIPTION_LEADER,
  MODULE_DESCRIPTION_RANKING
} from "../../shared/constants";
import { StageConfig, StageKind } from "@llm-mediation-experiments/utils";
import {
  createInfoStage,
  createProfileStage,
  createRevealVotedStage,
  createSurveyStage,
  createVoteForLeaderStage,
  isRankingModuleStage,
} from "../../shared/utils";

import { styles } from "./experiment_config_menu.scss";
import { ExperimenterService } from "../../services/experimenter_service";

/** Experiment config dropdown menu for adding stages. */
@customElement("experiment-config-menu")
export class ExperimentConfigMenu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);

  override render() {
    const onAddInfoClick = () => {
      this.experimentConfig.addStage(createInfoStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    const onAddSurveyClick = () => {
      this.experimentConfig.addStage(createSurveyStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    const onAddProfileClick = () => {
      this.experimentConfig.addStage(createProfileStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    return html`
      <pr-menu name="Add stage">
        <div class="menu-wrapper">
          <div class="stages">
            <div class="category">Stages</div>
            <div class="menu-item" role="button" @click=${onAddInfoClick}>
              Info stage
            </div>
            <div class="menu-item" role="button" @click=${onAddSurveyClick}>
              Survey stage
            </div>
            <div class="menu-item" role="button" @click=${onAddProfileClick}>
              Profile stage
            </div>
          </div>
          <div class="modules">
            <div class="category tertiary">Modules</div>
              ${this.renderLeaderModule()}
            </div>
        </div>
      </pr-menu>
    `;
  }

  private renderLeaderModule() {
    if (this.experimentConfig.hasStageKind(StageKind.VoteForLeader)) {
      return nothing;
    }

    const onAddLeaderClick = () => {
      this.experimentConfig.addStage(createVoteForLeaderStage());
      this.experimentConfig.addStage(createRevealVotedStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    }

    return html`
      <div class="menu-item" role="button" @click=${onAddLeaderClick}>
        <div class="module-title">Leader</div>
        <div class="module-info">${MODULE_DESCRIPTION_LEADER}</div>
      </div>
    `;
  }

  private renderRankingModule() {
    if (this.experimentConfig.stages.find(stage => isRankingModuleStage(stage))) {
      return nothing;
    }

    const onAddRankingClick = () => {
      // TODO: Generate and add ranking-related stages
    }

    return html`
      <div class="menu-item" role="button" @click=${onAddRankingClick}>
        <div class="module-title">Ranking</div>
        <div class="module-info">${MODULE_DESCRIPTION_RANKING}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config-menu": ExperimentConfigMenu;
  }
}
