import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '../info/info_config';
import '../survey/survey_config';
import '../tos/tos_config';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentConfigService} from '../../services/config/experiment_config_service';

import {StageConfig, StageKind} from '@llm-mediation-experiments/utils';
import {LAS_DESCRIPTION} from '../../shared/lost_at_sea/constants';
import {
  createLostAtSeaGameStages,
  isLostAtSeaGameStage,
} from '../../shared/lost_at_sea/utils';
import {
  createChatStage,
  createInfoStage,
  createPayoutStage,
  createProfileStage,
  createRevealStage,
  createSurveyStage,
  createVoteForLeaderStage,
} from '../../shared/utils';

import {styles} from './experiment_config_menu.scss';

/** Experiment config dropdown menu for adding stages. */
@customElement('experiment-config-menu')
export class ExperimentConfigMenu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);

  override render() {
    const onAddInfoClick = () => {
      this.experimentConfig.addStage(createInfoStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    };

    const onAddSurveyClick = () => {
      this.experimentConfig.addStage(createSurveyStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    };

    const onAddProfileClick = () => {
      this.experimentConfig.addStage(createProfileStage());
      this.experimentConfig.setCurrentStageIndexToLast();
    };

    const onAddChatClick = () => {
      this.experimentConfig.addStage(createChatStage('Simple chat'));
      this.experimentConfig.setCurrentStageIndexToLast();
    };

    const onAddPayoutClick = () => {
      this.experimentConfig.addStage(
        createPayoutStage({description: 'Hello world'})
      );
      this.experimentConfig.setCurrentStageIndexToLast();
    };

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
            <div class="menu-item" role="button" @click=${onAddChatClick}>
              Simple chat stage
            </div>
            ${this.renderLeaderStage()}
            <div class="menu-item" role="button" @click=${onAddPayoutClick}>
              Payout stage
            </div>
          </div>
          <div class="games">
            <div class="category tertiary">Games</div>
            ${this.renderLostAtSeaGame()}
          </div>
        </div>
      </pr-menu>
    `;
  }

  private renderLeaderStage() {
    if (this.experimentConfig.hasStageKind(StageKind.VoteForLeader)) {
      return nothing;
    }

    const onAddLeaderClick = () => {
      const voteStage = createVoteForLeaderStage();
      this.experimentConfig.addStage(voteStage);
      this.experimentConfig.addStage(
        createRevealStage({stagesToReveal: [voteStage.id]})
      );
      this.experimentConfig.setCurrentStageIndexToLast();
    };

    return html`
      <div class="menu-item" role="button" @click=${onAddLeaderClick}>
        Participant election
      </div>
    `;
  }

  private renderLostAtSeaGame() {
    if (
      this.experimentConfig.stages.find((stage) => isLostAtSeaGameStage(stage))
    ) {
      return nothing;
    }

    const onAddLostAtSeaClick = () => {
      // Load metadata. Todo: Reframe this as "Load game" instead of "Add stages."
      this.experimentConfig.publicName = '🌊 Adrift in the Atlantic';
      this.experimentConfig.isGroup = true;

      this.experimentConfig.hasMaxNumParticipants = true;
      this.experimentConfig.waitForAllToStart = true;
      this.experimentConfig.numMaxParticipants = 4;

      this.experimentConfig.isGroup = true;
      this.experimentConfig.numExperiments = 2;

      this.experimentConfig.stages = [];
      const lostAtSeaStages = createLostAtSeaGameStages();
      lostAtSeaStages.forEach((stage: StageConfig) => {
        this.experimentConfig.addStage(stage);
        if (stage.name === 'Lobby') {
          this.experimentConfig.dividerStageId = stage.id;
          this.experimentConfig.isMultiPart = true;
        }
      });
    };

    return html`
      <div class="menu-item" role="button" @click=${onAddLostAtSeaClick}>
        <div class="game-title">🌊 Lost at Sea</div>
        <div class="game-info">${LAS_DESCRIPTION}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-config-menu': ExperimentConfigMenu;
  }
}
