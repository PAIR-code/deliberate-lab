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
  createFlipCardStage,
  createPayoutStage,
  createPrivateChatStage,
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
  getChipMetadata,
  getChipNegotiationStageConfigs,
} from '../../shared/games/chip_negotiation';
import {
  RTV_AGENTS,
  RTV_METADATA,
  getRTVStageConfigs,
} from '../../shared/games/reality_tv_chat';
import {
  SALESPERSON_GAME_METADATA,
  getSalespersonStageConfigs,
} from '../../shared/games/salesperson';
import {
  TG_METADATA,
  getTgStageConfigs,
  TG_AGENTS,
} from '../../shared/games/test_game';
import {
  FLIPCARD_GAME_METADATA,
  getFlipCardGameStageConfigs,
} from '../../shared/games/flipcard_game';

import {styles} from './stage_builder_dialog.scss';

/** Stage builder dialog */
@customElement('stage-builder-dialog')
export class StageBuilderDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property({type: Boolean})
  showTemplates: boolean = false;

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
          ${this.showTemplates
            ? this.renderTemplateCards()
            : this.renderStageCards()}
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

    const toggleView = (showTemplates: boolean) => {
      this.showTemplates = showTemplates;
    };

    return html`
      <div class="tabs">
        <div
          class=${getClasses(!this.showTemplates)}
          @click=${() => {
            toggleView(false);
          }}
        >
          Add stages
        </div>
        <div
          class=${getClasses(this.showTemplates)}
          @click=${() => {
            toggleView(true);
          }}
        >
          Load template
        </div>
      </div>
    `;
  }

  private renderTemplateCards() {
    return html`
      <div class="banner error">
        ⚠️ Loading a template will override all existing stages in your
        configuration
      </div>
      <div class="card-gallery-wrapper">
        ${this.renderLASCard()} ${this.renderLASCard(true)}
        ${this.renderRealityTVCard()} ${this.renderChipNegotiationCard()}
        ${this.renderSalespersonGameCard()} ${this.renderFlipCardGameCard()}
        ${this.renderTestGameCard()}
      </div>
    `;
  }

  private renderStageCards() {
    return html`
      <div class="gallery-section">
        <div class="gallery-title">Basic stages</div>
        <div class="card-gallery-wrapper">
          ${this.renderTOSCard()} ${this.renderInfoCard()}
          ${this.renderProfileCard()}
        </div>
      </div>

      <div class="gallery-section">
        <div class="gallery-title">Chat stages</div>
        <div class="card-gallery-wrapper">
          ${this.renderGroupChatCard()} ${this.renderPrivateChatCard()}
        </div>
      </div>

      <div class="gallery-section">
        <div class="gallery-title">Other stages</div>
        <div class="card-gallery-wrapper">
          ${this.renderTransferCard()} ${this.renderSurveyCard()}
          ${this.renderSurveyPerParticipantCard()} ${this.renderFlipCardCard()}
          ${this.renderRankingCard()} ${this.renderRevealCard()}
          ${this.renderPayoutCard()}
        </div>
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
    const addGame = (numChips: number) => {
      this.addGame(
        getChipMetadata(numChips),
        getChipNegotiationStageConfigs(numChips),
      );
    };

    return html`
      <div class="card" @click=${() => addGame(2)}>
        <div class="title">${getChipMetadata(2).name}</div>
        <div>${getChipMetadata(2).description}</div>
      </div>
      <div class="card" @click=${() => addGame(3)}>
        <div class="title">${getChipMetadata(3).name}</div>
        <div>${getChipMetadata(3).description}</div>
      </div>
      <div class="card" @click=${() => addGame(4)}>
        <div class="title">${getChipMetadata(4).name}</div>
        <div>${getChipMetadata(4).description}</div>
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

  private renderTestGameCard() {
    const addGame = () => {
      this.addGame(TG_METADATA, getTgStageConfigs(), TG_AGENTS);
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">${TG_METADATA.publicName}</div>
        <div>${TG_METADATA.description}</div>
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

  private renderGroupChatCard() {
    const addStage = () => {
      this.addStage(createChatStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">Group chat</div>
        <div>
          Host a conversation among <i>all</i> participants in a cohort and
          optional mediator(s).
        </div>
      </div>
    `;
  }

  private renderPrivateChatCard() {
    const addStage = () => {
      this.addStage(createPrivateChatStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">Private chat</div>
        <div>
          Enable each participant to privately chat <i>only</i> with added
          mediator(s).
        </div>
      </div>
    `;
  }

  private renderFlipCardCard() {
    const addStage = () => {
      this.addStage(createFlipCardStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">🔄 FlipCard</div>
        <div>
          Present cards that participants can flip to reveal additional
          information and make selections.
        </div>
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

  private renderFlipCardGameCard() {
    const addGame = () => {
      this.addGame(FLIPCARD_GAME_METADATA, getFlipCardGameStageConfigs(), []);
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">🔄 FlipCard Game</div>
        <div>
          A demonstration of the FlipCard stage with adventure selection cards.
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
