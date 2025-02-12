import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/tooltip';

import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  RevealAudience,
  RevealItem,
  RevealStageConfig,
  StageConfig,
  StageKind,
  SurveyRevealItem,
  createNewRevealItem,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {getPrecedingRevealableStages} from '../../shared/experiment.utils';

import {styles} from './reveal_editor.scss';

/** Reveal stage editor */
@customElement('reveal-editor')
export class RevealEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: RevealStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    return html`
      <div class="header">
        <div class="left">Stages to reveal</div>
        ${this.renderAddMenu()}
      </div>
      ${this.stage.items.map((item, index) =>
        this.renderRevealStageItem(item, index),
      )}
    `;
  }

  private renderAddMenu() {
    if (!this.stage) return nothing;

    const stageOptions = getPrecedingRevealableStages(
      this.stage?.id,
      this.experimentEditor.stages,
    );
    const noAvailableStages = stageOptions.length === 0;
    const tooltipText = noAvailableStages
      ? 'No stages available. Only survey and election stages that precede this stage can be revealed.'
      : '';
    return html`
      <pr-tooltip position="TOP_END" text=${tooltipText}>
        <pr-menu
          name="Add stage"
          ?disabled=${!this.experimentEditor.canEditStages || noAvailableStages}
        >
          <div class="menu-wrapper">
            <div class="stages">
              ${stageOptions.map((stage) => this.renderAddRevealStage(stage))}
            </div>
          </div>
        </pr-menu>
      </pr-tooltip>
    `;
  }

  private renderAddRevealStage(stage: StageConfig) {
    const onAdd = () => {
      if (!this.stage) return;

      const item = createNewRevealItem(stage.id, stage.kind);
      if (!item) return;

      const items = [...this.stage.items, item];
      this.experimentEditor.updateStage({
        ...this.stage,
        items,
      });
    };

    const stageIndex = this.experimentEditor.stages.findIndex(
      (s) => s.id === stage.id,
    );

    return html`
      <div class="menu-item" role="button" @click=${onAdd}>
        ${stageIndex + 1}. ${stage.name}
      </div>
    `;
  }

  private updateRevealItem(item: RevealItem, index: number) {
    if (!this.stage) return;

    const items = [
      ...this.stage.items.slice(0, index),
      item,
      ...this.stage.items.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      items,
    });
  }

  private renderRevealStageItem(item: RevealItem, index: number) {
    const handleMoveUp = () => {
      if (!this.stage) return;

      const items = [
        ...this.stage.items.slice(0, index - 1),
        ...this.stage.items.slice(index, index + 1),
        ...this.stage.items.slice(index - 1, index),
        ...this.stage.items.slice(index + 1),
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        items,
      });
    };

    const handleMoveDown = () => {
      if (!this.stage) return;

      const items = [
        ...this.stage.items.slice(0, index),
        ...this.stage.items.slice(index + 1, index + 2),
        ...this.stage.items.slice(index, index + 1),
        ...this.stage.items.slice(index + 2),
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        items,
      });
    };

    const handleDelete = (e: Event) => {
      if (!this.stage) return;

      const items = [
        ...this.stage.items.slice(0, index),
        ...this.stage.items.slice(index + 1),
      ];

      this.experimentEditor.updateStage({
        ...this.stage,
        items,
      });
    };

    const stage = this.experimentEditor.getStage(item.id);
    const stageIndex = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === item.id,
    );
    if (!this.stage || !stage) return nothing;

    const revealAllParticipants =
      item.revealAudience === RevealAudience.ALL_PARTICIPANTS;

    const toggleRevealAllParticipants = () => {
      const revealAudience = revealAllParticipants
        ? RevealAudience.CURRENT_PARTICIPANT
        : RevealAudience.ALL_PARTICIPANTS;

      this.updateRevealItem({...item, revealAudience}, index);
    };

    return html`
      <div class="reveal-stage">
        <div class="header">
          <div class="label">${stageIndex + 1}. ${stage.name}</div>
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
              ?disabled=${index === this.stage.items.length - 1 ||
              !this.experimentEditor.canEditStages}
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
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${revealAllParticipants}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${toggleRevealAllParticipants}
          >
          </md-checkbox>
          <div>Reveal selections by all participants within the cohort</div>
        </div>
        ${item.kind === StageKind.SURVEY
          ? this.renderSurveyRevealSettings(item, index)
          : nothing}
      </div>
    `;
  }

  private renderSurveyRevealSettings(item: SurveyRevealItem, index: number) {
    if (!this.stage) return;

    const revealScorableOnly = item.revealScorableOnly;

    const toggleRevealScorableOnly = () => {
      this.updateRevealItem(
        {...item, revealScorableOnly: !revealScorableOnly},
        index,
      );
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${revealScorableOnly}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${toggleRevealScorableOnly}
        >
        </md-checkbox>
        <div>
          Reveal only scorable questions (questions with correct answers)
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reveal-editor': RevealEditor;
  }
}
