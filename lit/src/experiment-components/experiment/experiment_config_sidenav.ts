import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import {
  ExperimentConfigService
} from "../../services/config/experiment_config_service";
import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { ChatKind, ExperimentTemplate, StageConfig, StageKind } from "@llm-mediation-experiments/utils";
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
import { generateId } from "../../shared/utils";
import { LAS_ID, LAS_DESCRIPTION } from "../../shared/lost_at_sea/constants";
import { isLostAtSeaGameStage } from "../../shared/lost_at_sea/utils";

import { ExperimenterService } from "../../services/experimenter_service";
import { styles } from "./experiment_config_sidenav.scss";

/** Sidenav component for experiment config page */
@customElement("experiment-config-sidenav")
export class ExperimentConfigSidenav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly authService = core.getService(AuthService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return this.renderNav();
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
      <div class=${settingsClasses} role="button" @click=${handleClick}>
        🛠️&nbsp; Experiment ${this.experimentConfig.isGroup ? 'group' : ''} settings
      </div>
      ${this.experimentConfig.stages.map(
        (stage, index) => this.renderStageNavItem(stage, index)
      )}
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
          <div>${index + 1}. ${stage.name}</div>
          ${this.experimentConfig.dividerStageId === stage.id ?
            html`<div class="chip tertiary">lobby stage</div>` : nothing}
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
          ${this.renderDeleteStage(index)}
        </div>
      </div>
    `;
  }

  private renderDeleteStage(index: number) {
    const stage: StageConfig = this.experimentConfig.stages[index];

    if (!stage || stage.kind === StageKind.TermsOfService) {
      return html`<div class="icon-wrapper"></div>`;
    }

    const handleDelete = () => {
      this.experimentConfig.deleteStage(index);
    };

    return html`
      <div class="icon-wrapper">
        <pr-icon-button
          color="error"
          icon="delete"
          padding="small"
          size="small"
          variant="default"
          @click=${handleDelete}
        >
          Delete stage
        </pr-icon-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config-sidenav": ExperimentConfigSidenav;
  }
}
