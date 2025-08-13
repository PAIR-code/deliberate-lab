import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {StageConfig} from '@deliberation-lab/utils';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {getPrivateExperimentName} from '../../shared/experiment.utils';

import {styles} from './experiment_builder_nav.scss';

/** Sidenav for experiment builder */
@customElement('experiment-builder-nav')
export class ExperimentBuilderNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    return html`
      <div class="buttons header">
        ${this.renderAddStageButton()} ${this.renderLoadTemplateButton()}
      </div>
      <div class="nav-items-wrapper">
        ${this.experimentEditor.stages.map((stage, index) =>
          this.renderStageItem(stage, index),
        )}
      </div>
    `;
  }

  private renderStageItem(stage: StageConfig, index: number) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected: this.experimentEditor.currentStageId === stage.id,
    });

    const handleMoveUp = (e: Event) => {
      this.analyticsService.trackButtonClick(ButtonClick.STAGE_MOVE_UP);
      this.experimentEditor.moveStageUp(index);
      e.stopPropagation();
    };

    const handleMoveDown = (e: Event) => {
      this.analyticsService.trackButtonClick(ButtonClick.STAGE_MOVE_DOWN);
      this.experimentEditor.moveStageDown(index);
      e.stopPropagation();
    };

    const handleDelete = () => {
      this.analyticsService.trackButtonClick(ButtonClick.STAGE_DELETE);
      this.experimentEditor.deleteStage(index);
    };

    return html`
      <div class="nav-item-wrapper">
        <div
          class=${navItemClasses}
          role="button"
          @click=${() => {
            this.experimentEditor.setCurrentStageId(stage.id);
          }}
        >
          ${index + 1}. ${stage.name}
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
            ?disabled=${index === this.experimentEditor.stages.length - 1 ||
            !this.experimentEditor.canEditStages}
            @click=${handleMoveDown}
          >
          </pr-icon-button>
          <pr-icon-button
            color="error"
            icon="delete"
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

  private renderAddStageButton() {
    return html`
      <pr-button
        color="tertiary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.experimentEditor.toggleStageBuilderDialog(false);
        }}
      >
        + Add stage
      </pr-button>
    `;
  }

  private renderLoadTemplateButton() {
    return html`
      <pr-button
        color="neutral"
        variant="default"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.experimentEditor.toggleStageBuilderDialog(true);
        }}
      >
        Load template
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-builder-nav': ExperimentBuilderNav;
  }
}
