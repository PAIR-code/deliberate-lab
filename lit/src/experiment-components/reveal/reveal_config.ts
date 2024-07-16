import "../../pair-components/icon_button";
import "../../pair-components/menu";

import '@material/web/checkbox/checkbox.js';

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { StageConfig } from "@llm-mediation-experiments/utils";

import { core } from "../../core/core";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { RevealConfigService } from "../../services/config/reveal_config_service";

import { styles } from "./reveal_config.scss";

/** Reveal config */
@customElement("reveal-config")
export class RevealConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly revealConfig = core.getService(RevealConfigService);

  override render() {
    return html`
      <div class="title-wrapper">
        <div class="title">Stages to reveal</div>
        ${this.renderAddMenu()}
      </div>
      ${this.revealConfig.stagesToReveal.map(
        (stageId, index) => this.renderRevealStageItem(stageId, index)
      )}
    `;
  }

  private renderAddMenu() {
    return html`
      <pr-menu name="Add stage">
        <div class="menu-wrapper">
          <div class="stages">
            ${this.experimentConfig.stages.filter(
              stage => this.revealConfig.stage?.stagesToReveal.indexOf(stage.id) === -1
              && stage.id !== this.revealConfig.stage?.id
            ).map(stage => this.renderAddRevealStage(stage.id))}
          </div>
        </div>
      </pr-menu>
    `;
  }

  private renderAddRevealStage(stageId: string) {
    const onAdd = () => {
      this.revealConfig.addRevealStage(stageId);
    };

    return html`
      <div class="menu-item" role="button" @click=${onAdd}>
        ${this.experimentConfig.getStage(stageId)?.name}
      </div>
    `;
  }

  private renderRevealStageItem(stageId: string, index: number) {
    const handleMoveUp = (e: Event) => {
      this.revealConfig.moveRevealStageUp(index);
      e.stopPropagation();
    }

    const handleMoveDown = (e: Event) => {
      this.revealConfig.moveRevealStageDown(index);
      e.stopPropagation();
    }

    const handleDelete = (e: Event) => {
      this.revealConfig.deleteRevealStage(index);
    }

    return html`
      <div class="reveal-stage">
        <div class="label">
          ${this.experimentConfig.getStage(stageId)?.name}
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
            ?disabled=${index === this.revealConfig.stagesToReveal.length - 1}
            @click=${handleMoveDown}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reveal-config": RevealConfig;
  }
}
