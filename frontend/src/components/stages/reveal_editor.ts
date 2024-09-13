
import "../../pair-components/icon_button";
import "../../pair-components/menu";

import '@material/web/checkbox/checkbox.js';

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  RevealStageConfig,
  StageConfig
} from "@deliberation-lab/utils";

import { core } from "../../core/core";
import { ExperimentEditor } from "../../services/experiment.editor";

import {
  getStagesWithReveal
} from '../../shared/experiment.utils';

import { styles } from "./reveal_editor.scss";

/** Reveal stage editor */
@customElement("reveal-editor")
export class RevealEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: RevealStageConfig|undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    return html`
      <div class="header">
        <div class="left">Stages to reveal</div>
        ${this.renderAddMenu()}
      </div>
      ${this.stage.stageIds.map(
        (stageId, index) => this.renderRevealStageItem(stageId, index)
      )}
    `;
  }

  private renderAddMenu() {
    if (!this.stage) return nothing;

    const stageOptions = getStagesWithReveal(this.experimentEditor.stages).filter(
      stage => !this.stage!.stageIds.find(stageId => stageId === stage.id)
    );

    return html`
      <pr-menu name="Add stage" ?disabled=${!this.experimentEditor.canEditStages}>
        <div class="menu-wrapper">
          <div class="stages">
            ${stageOptions.length === 0 ? html`<div class="empty-message">No stages available</div>` : nothing}
            ${stageOptions.map(stage => this.renderAddRevealStage(stage))}
          </div>
        </div>
      </pr-menu>
    `;
  }

  private renderAddRevealStage(stage: StageConfig) {
    const onAdd = () => {
      if (!this.stage) return;

      const stageIds = [...this.stage.stageIds, stage.id];
      this.experimentEditor.updateStage({
        ...this.stage,
        stageIds
      });
    };

    const stageIndex = this.experimentEditor.stages.findIndex(
      s => s.id === stage.id
    );

    return html`
      <div class="menu-item" role="button" @click=${onAdd}>
        ${stageIndex + 1}. ${stage.name}
      </div>
    `;
  }

  private renderRevealStageItem(stageId: string, index: number) {
    const handleMoveUp = () => {
      if (!this.stage) return;

      const stageIds = [
        ...this.stage.stageIds.slice(0, index - 1),
        ...this.stage.stageIds.slice(index, index + 1),
        ...this.stage.stageIds.slice(index - 1, index),
        ...this.stage.stageIds.slice(index + 1),
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        stageIds
      });
    };

    const handleMoveDown = () => {
      if (!this.stage) return;

      const stageIds = [
        ...this.stage.stageIds.slice(0, index),
        ...this.stage.stageIds.slice(index + 1, index + 2),
        ...this.stage.stageIds.slice(index, index + 1),
        ...this.stage.stageIds.slice(index + 2),
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        stageIds
      });
    };

    const handleDelete = (e: Event) => {
      if (!this.stage) return;

      const stageIds = [
        ...this.stage.stageIds.slice(0, index),
        ...this.stage.stageIds.slice(index + 1)
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        stageIds
      });
    };

    const stage = this.experimentEditor.getStage(stageId);
    const stageIndex = this.experimentEditor.stages.findIndex(
      stage => stage.id === stageId
    );
    if (!this.stage || !stage) return nothing;

    return html`
      <div class="reveal-stage">
        <div class="label">
          ${stageIndex + 1}. ${stage.name}
        </div>
        <div class="buttons">
          <pr-icon-button
            color="neutral"
            icon="arrow_upward"
            padding="small"
            size="small"
            variant="default"
            ?disabled=${index === 0 || !this.experimentEditor.canEditStages}
            @click=${handleMoveUp}
          >
          </pr-icon-button>
          <pr-icon-button
            color="neutral"
            icon="arrow_downward"
            padding="small"
            size="small"
            variant="default"
            ?disabled=${index === this.stage.stageIds.length - 1 || !this.experimentEditor.canEditStages}
            @click=${handleMoveDown}
          >
          </pr-icon-button>
          <pr-icon-button
            color="neutral"
            icon="close"
            padding="small"
            size="small"
            variant="default"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${handleDelete}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "reveal-editor": RevealEditor;
  }
}