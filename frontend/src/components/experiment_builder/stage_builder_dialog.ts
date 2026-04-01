import '../../pair-components/icon_button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {HomeService} from '../../services/home.service';

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
  CharityDebateConfig,
  CHARITY_DEBATE_METADATA,
  createCharityDebateConfig,
  getCharityDebateTemplate,
} from '../../shared/templates/charity_allocations';
import {
  OOTB_CHARITY_DEBATE_METADATA,
  getOOTBCharityDebateTemplate,
} from '../../shared/templates/charity_allocations_ootb';
import {
  CONSENSUS_METADATA,
  getConsensusTopicTemplate,
} from '../../shared/templates/debate_topics';

import {
  DEFAULT_TEMPLATES,
  RESEARCH_TEMPLATES,
  CodeBasedTemplate,
} from '../../shared/default_templates';

import {styles} from './stage_builder_dialog.scss';

/** Stage builder dialog */
@customElement('stage-builder-dialog')
export class StageBuilderDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly homeService = core.getService(HomeService);

  @property({type: Boolean})
  showTemplates: boolean = false;

  // Used to populate charity allocation template
  @state() private charityDebateConfig: CharityDebateConfig =
    createCharityDebateConfig();
  // Used to populate resource allocation template
  @state() private consensusTopics: string = 'Climate Change';

  @state() private searchText: string = '';

  override connectedCallback() {
    super.connectedCallback();
    this.experimentEditor.loadTemplates();
  }

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

  private renderSearchBar() {
    return html`
      <div class="search-container">
        <pr-icon icon="search" size="small"></pr-icon>
        <pr-textarea
          placeholder="Search templates"
          variant="outlined"
          .value=${this.searchText}
          @input=${(e: InputEvent) => {
            this.searchText = (e.target as HTMLTextAreaElement).value;
          }}
        ></pr-textarea>
      </div>
    `;
  }

  private renderTemplateCards() {
    return html`
      <div class="banner error">
        ⚠️ Loading a template will override all existing stages in your
        configuration!
      </div>
      ${this.renderSearchBar()}
      <div class="card-gallery-wrapper">
        <div class="gallery-section">
          <div class="gallery-title">Pre-defined Templates</div>
          <div class="card-gallery-wrapper">
            ${this.renderPredefinedTemplates()}
          </div>
        </div>
        ${this.experimentEditor.savedTemplates.length > 0
          ? html`
              <div class="gallery-section">
                <div class="gallery-title">Saved Templates</div>
                <div class="card-gallery-wrapper">
                  ${this.renderSavedTemplates()}
                </div>
              </div>
            `
          : nothing}
      </div>
      ${this.authService.hasResearchTemplateAccess
        ? this.renderResearchTemplateGallery()
        : nothing}
    `;
  }

  // Refactored to allow search filtering on pre-defined templates
  private renderPredefinedTemplates() {
    const q = this.searchText.toLowerCase();
    const matches = (text: string) => text.toLowerCase().includes(q);

    const filtered = DEFAULT_TEMPLATES.filter(
      (t) => !q || matches(t.name + t.description),
    );

    if (filtered.length === 0) return nothing;

    return html`${filtered.map((t) => this.renderCodeBasedTemplateCard(t))}`;
  }

  private renderCodeBasedTemplateCard(t: CodeBasedTemplate) {
    return html`
      <div class="card" @click=${() => this.addTemplate(t.factory())}>
        <div class="title">${t.name}</div>
        <div>${t.description}</div>
      </div>
    `;
  }

  // This is a temporary set of hardcoded templates defined in the frontend
  // visible to experimenters who are marked for "research template" access.
  // Eventually, all these templates should be migrated such that they
  // are completely created in the UI and stored in the backend.
  private renderResearchTemplateGallery() {
    const simpleResearchTemplates = RESEARCH_TEMPLATES.filter(
      (t) => !['consensus_debate', 'charity_debate'].includes(t.id),
    );

    return html`
      <div class="banner">
        Note: Only specific experimenters have access to the following research
        templates! This list is controlled by the deployment owners.
      </div>
      <div class="gallery-section">
        <div class="gallery-title">Research Templates</div>
        <div class="card-gallery-wrapper">
          ${simpleResearchTemplates.map((t) =>
            this.renderCodeBasedTemplateCard(t),
          )}
        </div>
      </div>
      <div class="gallery-section">
        <div class="gallery-title">Debate experiments (Customizable)</div>
        <div class="card-gallery-wrapper">
          ${this.renderConsensusDebateCard()}
          ${this.renderCharityDebateTemplateCard()}
          ${this.renderOOTBCharityDebateTemplateCard()}
        </div>
      </div>
    `;
  }

  private renderSavedTemplates() {
    const q = this.searchText.toLowerCase();
    const filtered = this.experimentEditor.savedTemplates.filter(
      (t) =>
        !q ||
        t.experiment.metadata.name.toLowerCase().includes(q) ||
        t.experiment.metadata.description.toLowerCase().includes(q),
    );

    if (filtered.length === 0) {
      if (this.searchText) return html`<div>No matching saved templates</div>`;
      return nothing;
    }

    return html`
      ${filtered.map(
        (template) => html`
          <div class="card saved-template">
            <div
              class="card-content"
              @click=${() => this.addTemplate(template)}
            >
              <div class="title">${template.experiment.metadata.name}</div>
              <div>${template.experiment.metadata.description}</div>
              <div class="template-footer">
                <div class="creator">
                  By
                  ${this.homeService.getExperimenterName(
                    template.experiment.metadata.creator,
                  )}
                </div>
              </div>
            </div>
            <div class="card-actions">
              <pr-icon-button
                icon="delete"
                color="error"
                variant="default"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  if (
                    confirm('Are you sure you want to delete this template?')
                  ) {
                    this.experimentEditor.deleteTemplate(template.id);
                  }
                }}
              >
              </pr-icon-button>
            </div>
          </div>
        `,
      )}
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
          ${this.renderComprehensionCard()} ${this.renderRankingCard()}
          ${this.renderRevealCard()} ${this.renderPayoutCard()}
          ${this.renderRoleCard()}
        </div>
      </div>

      <div class="gallery-section">
        <div class="gallery-title">
          Experimental stages: ⚠️ use with caution
        </div>
        <div class="card-gallery-wrapper">
          ${this.renderFlipCardCard()} ${this.renderStockInfoCard()}
          ${this.renderAssetAllocationCard()}
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
        <div class="title">🎭 Role assignment</div>
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
        <div class="title">👥 Group chat</div>
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
        <div class="title">💬 Private chat</div>
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

  private renderAssetAllocationCard() {
    const addStage = () => {
      this.addStage(createAssetAllocationStage());
    };

    return html`
      <div class="card" @click=${addStage}>
        <div class="title">🧮 2-Stock Asset Allocation</div>
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
        <div class="title">🧑‍🤝‍🧑 Survey per participant</div>
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
      this.addTemplate(getConsensusTopicTemplate(this.consensusTopics));
    };

    const onTopicsInput = (e: Event) => {
      this.consensusTopics = (e.target as HTMLInputElement).value;
    };

    return html`
      <div class="card">
        <div class="title">${CONSENSUS_METADATA.name}</div>
        <div>${CONSENSUS_METADATA.description}</div>
        <div class="template-controls">
          <pr-textarea
            variant="outlined"
            placeholder="Debate topic (e.g., 'Climate Change,Vaccinations,AI Ethics')"
            .value=${this.consensusTopics}
            @input=${onTopicsInput}
          ></pr-textarea>
        </div>
        <pr-button @click=${loadTemplate}> Load Template </pr-button>
      </div>
    `;
  }

  private renderCharityCheckbox(
    field: keyof CharityDebateConfig,
    labelText: string,
  ) {
    return html`
      <label class="custom-checkbox">
        <input
          type="checkbox"
          .checked=${this.charityDebateConfig[field]}
          @change=${(e: Event) => {
            // Use a new object to trigger a Lit update
            this.charityDebateConfig = {
              ...this.charityDebateConfig,
              [field]: (e.target as HTMLInputElement).checked,
            };
          }}
        />
        <span class="checkmark"></span>
        <span class="label-text">${labelText}</span>
      </label>
    `;
  }

  private renderFacilitatorTextbox(
    field: keyof CharityDebateConfig,
    labelText: string,
  ) {
    const currentValue = String(this.charityDebateConfig[field] ?? '');

    return html`
      <label class="custom-textbox">
        <input
          type="number"
          .value=${currentValue}
          @input=${(e: Event) => {
            const inputValue = (e.target as HTMLInputElement).value;
            const newNumberValue = Number(inputValue);
            this.charityDebateConfig = {
              ...this.charityDebateConfig,
              [field]: newNumberValue,
            };
          }}
        />
        <span class="label-text">${labelText}</span>
      </label>
    `;
  }

  private renderCharityDebateTemplateCard() {
    const loadTemplate = () => {
      this.addTemplate(getCharityDebateTemplate(this.charityDebateConfig));
    };

    const onFacilitatorConfigInput = (e: Event) => {
      this.consensusTopics = (e.target as HTMLInputElement).value;
    };

    return html`
      <div class="card large-card">
        <div class="title">${CHARITY_DEBATE_METADATA.name}</div>
        <div>${CHARITY_DEBATE_METADATA.description}</div>
        <div class="template-controls">
          <div class="subtitle">Configure Experiment Stages</div>

          ${this.renderCharityCheckbox(
            'includeTos',
            'Include Terms of Service',
          )}
          ${this.renderCharityCheckbox(
            'includeMediator',
            '[Conditional] Include AI Mediator & Surveys',
          )}
          ${this.renderCharityCheckbox(
            'includeInitialParticipantSurvey',
            'Include Initial Participant Survey',
          )}
          ${this.renderCharityCheckbox(
            'includeDiscussionEvaluation',
            '[Optional] Include Discussion Evaluation',
          )}
          ${this.renderCharityCheckbox(
            'includeDebriefingAndFeedback',
            '[Optional] Include Debriefing & Experiment Feedback',
          )}
          ${this.renderCharityCheckbox(
            'includeMetaFeedback',
            '[Optional] Include Meta-Feedback Survey',
          )}
          ${this.renderFacilitatorTextbox(
            'facilitatorConfigId',
            '[Optional] Choose from a preset faciliator order (default is None, Habermas, Dynamic mediators). ',
          )}
        </div>

        <pr-button @click=${loadTemplate}> Load Template </pr-button>
      </div>
    `;
  }

  private renderOOTBCharityDebateTemplateCard() {
    const loadTemplate = () => {
      this.addTemplate(getOOTBCharityDebateTemplate(this.charityDebateConfig));
    };

    const onFacilitatorConfigInput = (e: Event) => {
      this.consensusTopics = (e.target as HTMLInputElement).value;
    };

    return html`
      <div class="card large-card">
        <div class="title">${OOTB_CHARITY_DEBATE_METADATA.name}</div>
        <div>${OOTB_CHARITY_DEBATE_METADATA.description}</div>
        <div class="template-controls">
          <div class="subtitle">Configure Experiment Stages</div>

          ${this.renderCharityCheckbox(
            'includeTos',
            'Include Terms of Service',
          )}
          ${this.renderCharityCheckbox(
            'includeMediator',
            '[Conditional] Include AI Mediator & Surveys',
          )}
          ${this.renderCharityCheckbox(
            'includeInitialParticipantSurvey',
            'Include Initial Participant Survey',
          )}
          ${this.renderCharityCheckbox(
            'includeDiscussionEvaluation',
            '[Optional] Include Discussion Evaluation',
          )}
          ${this.renderCharityCheckbox(
            'includeDebriefingAndFeedback',
            '[Optional] Include Debriefing & Experiment Feedback',
          )}
          ${this.renderCharityCheckbox(
            'includeMetaFeedback',
            '[Optional] Include Meta-Feedback Survey',
          )}
          ${this.renderFacilitatorTextbox(
            'facilitatorConfigId',
            '[Optional] Choose from a preset faciliator order (default is None, Habermas, Dynamic mediators). ',
          )}
        </div>

        <pr-button @click=${loadTemplate}> Load Template </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-builder-dialog': StageBuilderDialog;
  }
}
