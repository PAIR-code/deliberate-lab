import './ranking_reveal_view';
import './survey_reveal_view';
import './allocation_reveal_view';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  RevealItem,
  MultiAssetAllocationRevealItem,
  RevealStageConfig,
  StageConfig,
  StageKind,
  STAGE_MANAGER,
  extractVariablesFromVariableConfigs,
  resolveTemplateVariables,
} from '@deliberation-lab/utils';

import {styles} from './reveal_view.scss';

/** Reveal stage summary view. */
@customElement('reveal-summary-view')
export class RevealView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: RevealStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="reveal-wrapper">
        ${this.stage.items.map((item) => this.renderItem(item))}
      </div>
    `;
  }

  private renderItem(item: RevealItem) {
    const rawStage = this.experimentService.getStage(item.id);
    const answer = this.participantService.answerMap[item.id];
    const publicData = this.cohortService.stagePublicDataMap[item.id];
    if (!rawStage) return nothing;

    // Resolve template variables in stage
    const experimentVariableMap =
      this.experimentService.experiment?.variableMap ?? {};
    const cohortVariableMap =
      this.cohortService.cohortConfig?.variableMap ?? {};
    const participantVariableMap =
      this.participantService.profile?.variableMap ?? {};
    const stage = STAGE_MANAGER.resolveTemplateVariablesInStage(
      rawStage,
      extractVariablesFromVariableConfigs(
        this.experimentService.experiment?.variableConfigs ?? [],
      ),
      {
        ...experimentVariableMap,
        ...cohortVariableMap,
        ...participantVariableMap,
      },
    );

    switch (item.kind) {
      case StageKind.CHIP:
        return html`
          <chip-reveal-view
            .stage=${stage}
            .item=${item}
            .publicData=${publicData}
          >
          </chip-reveal-view>
        `;
      case StageKind.RANKING:
        return html`
          <ranking-reveal-view .item=${item} .publicData=${publicData}>
          </ranking-reveal-view>
        `;
      case StageKind.SURVEY:
        return html`
          <survey-reveal-view .item=${item} .stage=${stage} .answer=${answer}>
          </survey-reveal-view>
        `;
      case StageKind.MULTI_ASSET_ALLOCATION:
        const allocationItem = item as MultiAssetAllocationRevealItem;
        return html`
          <allocation-reveal-view
            .stage=${stage}
            .publicData=${publicData}
            .displayMode=${allocationItem.displayMode}
          >
          </allocation-reveal-view>
        `;

      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reveal-summary-view': RevealView;
  }
}
