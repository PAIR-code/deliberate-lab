import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {ExperimentEditor} from '../../services/experiment.editor';

import {
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
  RTV_METADATA,
  getRTVStageConfigs,
} from '../../shared/games/reality_tv_chat';
import {
  SALESPERSON_GAME_METADATA,
  getSalespersonStageConfigs,
} from '../../shared/games/salesperson';

import {styles} from './stage_builder_dialog.scss';

/** Stage builder dialog */
@customElement('stage-builder-dialog')
export class StageBuilderDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

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
        ${this.renderLASCard()} ${this.renderLASCard(true)}
        ${this.renderRealityTVCard()} ${this.renderChipNegotiationCard()}
        ${this.renderSalespersonGameCard()}
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

  private addGame(metadata: Partial<MetadataConfig>, stages: StageConfig[]) {
    this.analyticsService.trackButtonClick(ButtonClick.GAME_ADD);
    this.experimentEditor.updateMetadata(metadata);
    this.experimentEditor.setStages(stages);
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
      this.addGame(RTV_METADATA, getRTVStageConfigs());
    };
    return html`
      <div class="card" @click=${addGame}>
        <div class="title">📺 ${RTV_METADATA.name}</div>
        <div>${RTV_METADATA.description}</div>
      </div>
    `;
  }

  private renderChipNegotiationCard() {
    const addGame = (numChips: number) => {
      this.addGame(
        CHIP_GAME_METADATA,
        getChipNegotiationStageConfigs(numChips),
      );
    };

    return html`
      <div class="card" @click=${() => addGame(2)}>
        <div class="title">🔴 ${CHIP_GAME_METADATA.name} (2 chips)</div>
        <div>${CHIP_GAME_METADATA.description}</div>
      </div>
      <div class="card" @click=${() => addGame(3)}>
        <div class="title">🔵 ${CHIP_GAME_METADATA.name} (3 chips)</div>
        <div>${CHIP_GAME_METADATA.description}</div>
      </div>
      <div class="card" @click=${() => addGame(4)}>
        <div class="title">🟣 ${CHIP_GAME_METADATA.name} (4 chips)</div>
        <div>${CHIP_GAME_METADATA.description}</div>
      </div>
    `;
  }

  private renderSalespersonGameCard() {
    const addGame = () => {
      this.addGame(SALESPERSON_GAME_METADATA, getSalespersonStageConfigs());
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">${SALESPERSON_GAME_METADATA.name}</div>
        <div>${SALESPERSON_GAME_METADATA.description}</div>
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
