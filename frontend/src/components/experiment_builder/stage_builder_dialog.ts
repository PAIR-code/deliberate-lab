import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  AgentPersonaType,
  ExperimentTemplate,
  MetadataConfig,
  StageConfig,
  StageKind,
  createAssetAllocationStage,
  createChatStage,
  createRankingStage,
  createInfoStage,
  createFlipCardStage,
  createMultiAssetAllocationStage,
  createPayoutStage,
  createPrivateChatStage,
  createProfileStage,
  createRevealStage,
  createRoleStage,
  createStockInfoStage,
  createSurveyPerParticipantStage,
  createSurveyStage,
  createTOSStage,
  createTransferStage,
  createComprehensionStage,
} from '@deliberation-lab/utils';
import {
  LAS_METADATA,
  ANON_LAS_METADATA,
  getLASStageConfigs,
  getAnonLASStageConfigs,
} from '../../shared/templates/lost_at_sea';
import {
  getChipMetadata,
  getChipNegotiationStageConfigs,
} from '../../shared/templates/chip_negotiation';
import {
  CONSENSUS_METADATA,
  getConsensusTopicTemplate,
} from '../../shared/templates/debate_topics';
import {
  RTV_METADATA,
  getRealityTVExperimentTemplate,
} from '../../shared/templates/reality_tv_chat';
import {
  SALESPERSON_GAME_METADATA,
  getSalespersonStageConfigs,
} from '../../shared/templates/salesperson';
import {
  FRUIT_TEST_METADATA,
  getFruitTestExperimentTemplate,
} from '../../shared/templates/fruit_test';
import {
  STOCKINFO_GAME_METADATA,
  getStockInfoGameStageConfigs,
} from '../../shared/templates/stockinfo_template';
import {
  FLIPCARD_TEMPLATE_METADATA,
  getFlipCardExperimentTemplate,
} from '../../shared/templates/flipcard';
import {
  ASSET_ALLOCATION_TEMPLATE_METADATA,
  getAssetAllocationTemplate,
} from '../../shared/templates/asset_allocation_template';
import {
  CONDITIONAL_SURVEY_TEMPLATE_METADATA,
  getConditionalSurveyTemplate,
} from '../../shared/templates/conditional_survey_template';
import {
  CHARITY_DEBATE_METADATA,
  CharityDebateConfig,
  getCharityDebateTemplate
} from '../../shared/templates/charity_allocations';
import {
  POLICY_METADATA,
  getPolicyExperimentTemplate,
} from '../../shared/templates/policy';

import {styles} from './stage_builder_dialog.scss';

/** Stage builder dialog */
@customElement('stage-builder-dialog')
export class StageBuilderDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

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
        ${this.renderSalespersonGameCard()} ${this.renderFlipCardTemplateCard()}
        ${this.renderFruitTestTemplateCard()} ${this.renderStockInfoGameCard()}
        ${this.renderAssetAllocationTemplateCard()}
        ${this.renderConditionalSurveyTemplateCard()}
        ${this.renderPolicyTemplateCard()}
        ${this.renderCharityDebateTemplateCard()}
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
          ${this.renderSurveyPerParticipantCard()}
          ${this.renderComprehensionCard()} ${this.renderFlipCardCard()}
          ${this.renderRankingCard()} ${this.renderRevealCard()}
          ${this.renderPayoutCard()} ${this.renderRoleCard()}
          ${this.renderStockInfoCard()} ${this.renderAssetAllocationCard()}
          ${this.renderMultiAssetAllocationCard()}
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

  private addTemplate(template: ExperimentTemplate) {
    this.analyticsService.trackButtonClick(ButtonClick.TEMPLATE_LOAD);
    this.experimentEditor.loadTemplate(template);
    this.experimentEditor.toggleStageBuilderDialog();
  }

  // TODO: Remove in favor of identical addTemplate
  // WARNING: This does NOT add agents
  private addGame(metadata: Partial<MetadataConfig>, stages: StageConfig[]) {
    this.analyticsService.trackButtonClick(ButtonClick.TEMPLATE_LOAD);
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
    const addTemplate = () => {
      this.addTemplate(getRealityTVExperimentTemplate());
    };
    return html`
      <div class="card" @click=${addTemplate}>
        <div class="title">${RTV_METADATA.name}</div>
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

  private renderFruitTestTemplateCard() {
    const addTemplate = () => {
      this.addTemplate(getFruitTestExperimentTemplate());
    };

    return html`
      <div class="card" @click=${addTemplate}>
        <div class="title">${FRUIT_TEST_METADATA.name}</div>
        <div>${FRUIT_TEST_METADATA.description}</div>
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

  private renderRoleCard() {
    const addStage = () => {
      this.addStage(createRoleStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">Role assignment</div>
        <div>
          Randomly assign roles to participants and show different
          Markdown-rendered info for each role
        </div>
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

  private renderStockInfoCard() {
    const addStage = () => {
      this.addStage(createStockInfoStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">📈 Stock Info</div>
        <div>
          Display stock information with charts, performance metrics, and
          configurable data cards.
        </div>
      </div>
    `;
  }

  private renderCharityDebateTemplateCard() {
  const loadTemplate = () => {
    const config: CharityDebateConfig = {
      includeTos: (this.shadowRoot?.querySelector('#charity-cb-tos') as any)?.checked,
      includeViewProfile: (this.shadowRoot?.querySelector('#charity-cb-profile') as any)?.checked,
      includeMediator: (this.shadowRoot?.querySelector('#charity-cb-mediator') as any)?.checked,
      includeInitialParticipantSurvey: (this.shadowRoot?.querySelector('#charity-cb-initial-survey') as any)?.checked,
      includePostDiscussionSurvey: (this.shadowRoot?.querySelector('#charity-cb-post-survey') as any)?.checked,
      includeDiscussionEvaluation: (this.shadowRoot?.querySelector('#charity-cb-discussion-eval') as any)?.checked,
      includePeerEvaluation: (this.shadowRoot?.querySelector('#charity-cb-peer-eval') as any)?.checked,
      includeMetaFeedback: (this.shadowRoot?.querySelector('#charity-cb-meta-eval') as any)?.checked,
    };
    
    this.addTemplate(getCharityDebateTemplate(config));
  };

  return html`
    <div class="card">
      <div class="title">${CHARITY_DEBATE_METADATA.name}</div>
      <div>${CHARITY_DEBATE_METADATA.description}</div>
      <div class="template-controls">
        <div class="subtitle">Configure Experiment Stages</div>

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-tos" checked>
          <span class="checkmark"></span>
          <span class="label-text">Include Terms of Service</span>
        </label>

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-profile">
          <span class="checkmark"></span>
          <span class="label-text">[Optional] Include View Assigned Profile Stage</span>
        </label>

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-mediator" checked>
          <span class="checkmark"></span>
          <span class="label-text">[Conditional] Include AI Mediator & Surveys</span>
        </label>
        
        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-initial-survey" checked>
          <span class="checkmark"></span>
          <span class="label-text">Include Initial Participant Survey</span>
        </label>

        <!-- The "Role/Value Assignment" checkbox has been removed. -->

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-post-survey" checked>
          <span class="checkmark"></span>
          <span class="label-text">Include Post-Discussion Survey</span>
        </label>

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-discussion-eval">
          <span class="checkmark"></span>
          <span class="label-text">[Optional] Include Discussion Evaluation</span>
        </label>

        <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-peer-eval" checked>
          <span class="checkmark"></span>
          <span class="label-text">[Optional] Include Peer Evaluation</span>
        </label>

         <label class="custom-checkbox">
          <input type="checkbox" id="charity-cb-meta-feedback">
          <span class="checkmark"></span>
          <span class="label-text">[Optional] Include Meta-Feedback Survey</span>
        </label>
      </div>
      <pr-button @click=${loadTemplate}>
        Load Template
      </pr-button>
    </div>
  `;
}


  private renderAssetAllocationCard() {
    const addStage = () => {
      this.addStage(createAssetAllocationStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">2-Stock Asset Allocation</div>
        <div>
          Allow participants to allocate investment portfolios between two
          stocks using interactive sliders.
        </div>
      </div>
    `;
  }

  private renderMultiAssetAllocationCard() {
    const addStage = () => {
      this.addStage(createMultiAssetAllocationStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">💰 Multi-Asset Allocation</div>
        <div>
          Allow participants to allocate investment portfolios between multiple
          stocks using interactive sliders.
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

  private renderComprehensionCard() {
    const addStage = () => {
      this.addStage(createComprehensionStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">✅ Comprehension</div>
        <div>
          Test participant understanding with questions and correct answers.
        </div>
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

private renderConsensusDebateCard() {
  const loadTemplate = () => {
    // Find the input element within the component's shadow DOM using its ID.
    const inputElement = this.shadowRoot?.querySelector('#consensus-topics-input') as any;

    // Get the value, using the default if the input is not found or is empty.
    const topicsCsv = inputElement?.value || 'Climate Change';

    // Pass the retrieved value to the existing template function.
    this.addTemplate(getConsensusTopicTemplate(topicsCsv));
  };

  return html`
    <div class="card">
      <div class="title">${CONSENSUS_METADATA.name}</div>
      <div>${CONSENSUS_METADATA.description}</div>
      <div class="template-controls">
        <pr-text-input
          id="consensus-topics-input"
          label="Topics (comma-separated)"
          value="Climate Change"
        ></pr-text-input>
        <pr-button @click=${loadTemplate}>
          Load Template
        </pr-button>
      </div>
    </div>
  `;
}



  private renderFlipCardTemplateCard() {
    const addTemplate = () => {
      this.addTemplate(getFlipCardExperimentTemplate());
    };

    return html`
      <div class="card" @click=${addTemplate}>
        <div class="title">${FLIPCARD_TEMPLATE_METADATA.name}</div>
        <div>${FLIPCARD_TEMPLATE_METADATA.description}</div>
      </div>
    `;
  }

  private renderStockInfoGameCard() {
    const addGame = () => {
      this.addGame(STOCKINFO_GAME_METADATA, getStockInfoGameStageConfigs());
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">📈 Stock Analysis Game</div>
        <div>
          A demonstration of the StockInfo stage with financial data analysis.
        </div>
      </div>
    `;
  }

  private renderAssetAllocationTemplateCard() {
    const addGame = () => {
      this.addGame(
        ASSET_ALLOCATION_TEMPLATE_METADATA,
        getAssetAllocationTemplate(),
      );
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">💰 Investment Portfolio Game</div>
        <div>
          A complete investment study with stock analysis and portfolio
          allocation decisions.
        </div>
      </div>
    `;
  }

  private renderConditionalSurveyTemplateCard() {
    const addGame = () => {
      this.addGame(
        CONDITIONAL_SURVEY_TEMPLATE_METADATA,
        getConditionalSurveyTemplate(),
      );
    };

    return html`
      <div class="card" @click=${addGame}>
        <div class="title">🔀 Conditional Survey Demo</div>
        <div>
          Advanced survey with complex conditional logic, demonstrating AND/OR
          operators and nested conditions.
        </div>
      </div>
    `;
  }

  private renderPolicyTemplateCard() {
    const addTemplate = () => {
      this.addTemplate(getPolicyExperimentTemplate());
    };

    return html`
      <div class="card" @click=${addTemplate}>
        <div class="title">${POLICY_METADATA.name}</div>
        <div>${POLICY_METADATA.description}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-builder-dialog': StageBuilderDialog;
  }
}