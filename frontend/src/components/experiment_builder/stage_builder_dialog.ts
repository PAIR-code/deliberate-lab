import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AgentEditor} from '../../services/agent.editor';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  AgentDataObject,
  MetadataConfig,
  StageConfig,
  StageKind,
  createChatStage,
  createRankingStage,
  createInfoStage,
  createPayoutStage,
  createProfileStage,
  createRevealStage,
  createSurveyPerParticipantStage,
  createSurveyStage,
  createTOSStage,
  createTransferStage,
} from '@deliberation-lab/utils';
import {
  LAS_METADATA,
  ANON_LAS_METADATA,
  getLASStageConfigs,
  getAnonLASStageConfigs,
} from '../../shared/games/lost_at_sea';
import {
  CHIP_GAME_METADATA,
  getChipNegotiationStageConfigs,
} from '../../shared/games/chip_negotiation';
import {
  RTV_AGENTS,
  RTV_METADATA,
  getRTVStageConfigs,
} from '../../shared/games/reality_tv_chat';
import {
  BBOT_METADATA,
  BBOT_AGENTS,
  getBbotStageConfigs,
} from '../../shared/games/bridging_bot';

import {styles} from './stage_builder_dialog.scss';

/** Stage builder dialog */
@customElement('stage-builder-dialog')
export class StageBuilderDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property({type: Boolean})
  showGames: boolean = false;

  override render() {
    return html`
      <div class="dialog">
        <div class="header">
          ${this.renderTabs()}
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${() => {
              this.experimentEditor.toggleStageBuilderDialog();
            }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          ${this.showGames ? this.renderGameCards() : this.renderStageCards()}
        </div>
      </div>
    `;
  }

  private renderTabs() {
    const getClasses = (selected: boolean) => {
      return classMap({
        tab: true,
        selected: selected,
      });
    };

    const toggleView = (showGames: boolean) => {
      this.showGames = showGames;
    };

    return html`
      <div class="tabs">
        <div
          class=${getClasses(!this.showGames)}
          @click=${() => {
            toggleView(false);
          }}
        >
          Add stages
        </div>
        <div
          class=${getClasses(this.showGames)}
          @click=${() => {
            toggleView(true);
          }}
        >
          Load game
        </div>
      </div>
    `;
  }

  private renderGameCards() {
    return html`
      <div class="banner error">
        ⚠️ Loading a game will override any current stages in your configuration
      </div>
      <div class="card-gallery-wrapper">
        ${this.renderLASCard()} ${this.renderLASCard(true)} ${this.renderRealityTVCard()}
        ${this.renderChipNegotiationCard()}
        ${this.renderBbotCard()}
      </div>
    `;
  }

  private renderStageCards() {
    return html`
      <div class="card-gallery-wrapper">
        ${this.renderTOSCard()} ${this.renderInfoCard()}
        ${this.renderTransferCard()} ${this.renderProfileCard()}
        ${this.renderSurveyCard()} ${this.renderSurveyPerParticipantCard()}
        ${this.renderChatCard()} ${this.renderRankingCard()}
        ${this.renderRevealCard()} ${this.renderPayoutCard()}
      </div>
    `;
  }

  private addStage(stage: StageConfig) {
    this.analyticsService.trackButtonClick(ButtonClick.STAGE_ADD);
    this.experimentEditor.addStage(stage);
    this.experimentEditor.toggleStageBuilderDialog();
    this.experimentEditor.jumpToLastStage();
  }

  private addGame(
    metadata: Partial<MetadataConfig>,
    stages: StageConfig[],
    agents: AgentDataObject[] = [],
  ) {
    this.analyticsService.trackButtonClick(ButtonClick.GAME_ADD);
    this.experimentEditor.updateMetadata(metadata);
    this.experimentEditor.setStages(stages);
    this.agentEditor.setAgentData(agents);
    this.experimentEditor.toggleStageBuilderDialog();
  }

  private renderLASCard(isAnon: boolean = false) {
    const metadata = isAnon ? ANON_LAS_METADATA : LAS_METADATA;
    const configs = isAnon ? getAnonLASStageConfigs() : getLASStageConfigs();

    const addGame = () => {
      this.addGame(metadata, configs);
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">${metadata.name}</div>
        <div>
          ${metadata.description}
          <div></div>
        </div>
      </div>
    `;
  }

  private renderRealityTVCard() {
    const addGame = () => {
      this.addGame(RTV_METADATA, getRTVStageConfigs(), RTV_AGENTS);
    };
    return html`
      <div class="card" @click=${addGame}>
        <div class="title">📺 ${RTV_METADATA.name}</div>
        <div>${RTV_METADATA.description}</div>
      </div>
    `;
  }

  private renderChipNegotiationCard() {
    const addGame = () => {
      this.addGame(CHIP_GAME_METADATA, getChipNegotiationStageConfigs());
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">🪙 ${CHIP_GAME_METADATA.name}</div>
        <div>${CHIP_GAME_METADATA.description}</div>
      </div>
    `;
  }

  private renderBbotCard() {
    const addGame = () => {
      this.addGame(BBOT_METADATA, getBbotStageConfigs(), BBOT_AGENTS);
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">🪙 ${BBOT_METADATA.name}</div>
        <div>${BBOT_METADATA.description}</div>
      </div>
    `;
  }

  private renderInfoCard() {
    const addStage = () => {
      this.addStage(createInfoStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">ℹ️ Info</div>
        <div>Display Markdown-rendered information.</div>
      </div>
    `;
  }

  private renderTOSCard() {
    const isDisabled = this.experimentEditor.hasStageKind(StageKind.TOS);

    const addStage = () => {
      if (!isDisabled) {
        this.addStage(createTOSStage());
      }
    };

    return html`
      <div class="card ${isDisabled ? 'disabled' : ''}" @click=${addStage}>
        <div class="title">📜 Terms of Service</div>
        <div>Display Markdown-rendered terms of service.</div>
      </div>
    `;
  }

  private renderChatCard() {
    const addStage = () => {
      this.addStage(createChatStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">💬 Group chat</div>
        <div>Host a conversation among participants and optional LLMs.</div>
      </div>
    `;
  }

  private renderRankingCard() {
    const addStage = () => {
      this.addStage(createRankingStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">🗳️ Ranking / Election</div>
        <div>
          Have participants rank each other or items, and optionally hold an
          election.
        </div>
      </div>
    `;
  }

  private renderRevealCard() {
    const addStage = () => {
      this.addStage(createRevealStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">👁️‍🗨️ Reveal</div>
        <div>
          Reveal the results of rankings, elections, and survey stage responses.
        </div>
      </div>
    `;
  }

  private renderSurveyCard() {
    const addStage = () => {
      this.addStage(createSurveyStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">📋 Survey</div>
        <div>
          Conduct a survey with freeform, multiple choice, checkbox, and scale
          questions.
        </div>
      </div>
    `;
  }

  private renderSurveyPerParticipantCard() {
    const addStage = () => {
      this.addStage(createSurveyPerParticipantStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">📋🧑‍🤝‍🧑 Survey per participant</div>
        <div>
          Ask each survey question about each participant in the current cohort.
        </div>
      </div>
    `;
  }

  private renderPayoutCard() {
    const addStage = () => {
      this.addStage(createPayoutStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">💰 Payout</div>
        <div>Display calculated experiment payouts.</div>
      </div>
    `;
  }

  private renderProfileCard() {
    const isDisabled = this.experimentEditor.hasStageKind(StageKind.PROFILE);

    const addStage = () => {
      if (!isDisabled) {
        this.addStage(createProfileStage());
      }
    };

    return html`
      <div class="card ${isDisabled ? 'disabled' : ''}" @click=${addStage}>
        <div class="title">👤 Profile</div>
        <div>Allow participants to set their profiles.</div>
      </div>
    `;
  }

  private renderTransferCard() {
    const addStage = () => {
      this.addStage(createTransferStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">🚪 Transfer</div>
        <div>
          Assign participants to different cohorts while they wait in this
          stage.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-builder-dialog': StageBuilderDialog;
  }
}
