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
  createSurveyStage,
  createTOSStage,
  createTransferStage,
} from '@deliberation-lab/utils';
import {LAS_METADATA, getLASStageConfigs} from '../../shared/games/lost_at_sea';
import {
  GCE_METADATA,
  getGCEStageConfigs,
} from '../../shared/games/gift_card_exchange';

import {styles} from './stage_builder_dialog.scss';
import {
  RTV_METADATA,
  getRTVStageConfigs,
} from '../../shared/games/reality_tv_chat';

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
        ${this.renderLASCard()} ${this.renderNegotiationCard()}
        ${this.renderRealityTVCard()}
      </div>
    `;
  }

  private renderStageCards() {
    return html`
      <div class="card-gallery-wrapper">
        ${this.renderTOSCard()} ${this.renderInfoCard()}
        ${this.renderTransferCard()} ${this.renderProfileCard()}
        ${this.renderSurveyCard()} ${this.renderChatCard()}
        ${this.renderRankingCard()} ${this.renderRevealCard()}
        ${this.renderPayoutCard()}
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

  private renderLASCard() {
    const addGame = () => {
      this.addGame(LAS_METADATA, getLASStageConfigs());
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">🌊 Lost at Sea</div>
        <div>
          An election scenario where participants deliberate together to elect a
          leader responsible for completing a survival task.
        </div>
      </div>
    `;
  }

  private renderNegotiationCard() {
    const addGame = () => {
      this.addGame(GCE_METADATA, getGCEStageConfigs());
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">💵 Gift Card Exchange</div>
        <div>
          A negotiation scenario where participants deliberate together to
          optimally allocate a bundle of gift cards.
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
        <div class="title">📺 Reality TV Discussion</div>
        <div>
          A conversation between multiple agents who discuss reality TV shows.
        </div>
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
    const addStage = () => {
      this.addStage(createProfileStage());
    };

    return html`
      <div class="card" @click=${addStage}>
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
