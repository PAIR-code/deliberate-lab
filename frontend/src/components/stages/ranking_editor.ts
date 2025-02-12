import '../../pair-components/textarea';
import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/checkbox/checkbox.js';
import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {
  RankingStageConfig,
  ElectionStrategy,
  RankingItem,
  createRankingItem,
  ParticipantRankingStage,
  ItemRankingStage,
} from '@deliberation-lab/utils';
import {styles} from './ranking_editor.scss';

/** Editor for ranking stage. */
@customElement('ranking-editor')
export class RankingEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: RankingStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }
    return html` ${this.renderRankingSettings()} `;
  }

  private renderRankingSettings() {
    if (!this.stage) return;

    const enableSelfVoting = (this.stage as ParticipantRankingStage)
      .enableSelfVoting;
    const isElection = this.stage.strategy === ElectionStrategy.CONDORCET;
    const isParticipantRanking = this.stage.rankingType === 'participants';

    const updateRankingType = () => {
      if (!this.stage) return;
      const newType = isParticipantRanking ? 'items' : 'participants';
      const updatedStage = {...this.stage, rankingType: newType} as
        | ParticipantRankingStage
        | ItemRankingStage;
      if (newType === 'participants') {
        (updatedStage as ParticipantRankingStage).enableSelfVoting = false; // Reset self-voting if switched to non-participant election
      }
      this.experimentEditor.updateStage(updatedStage);
    };

    const toggleSelfVoting = () => {
      if (!this.stage) return;
      const updatedStage = {
        ...this.stage,
        enableSelfVoting: !enableSelfVoting,
      } as ParticipantRankingStage;
      this.experimentEditor.updateStage(updatedStage);
    };

    const toggleElectionStrategy = () => {
      if (!this.stage) return;
      const newStrategy = isElection
        ? ElectionStrategy.NONE
        : ElectionStrategy.CONDORCET;
      const updatedStage = {
        ...this.stage,
        strategy: newStrategy,
      };
      this.experimentEditor.updateStage(updatedStage);
    };

    const waitingWarning = html`<div class="warning">
      As the 'Wait for all participants' box is unchecked, any anticipated
      participants who have not yet joined the experiment by the time this stage
      is reached may be excluded as candidates in participant rankings, and
      their votes will not be counted in any elections.
    </div>`;
    const waitForAllParticipants = this.stage.progress.waitForAllParticipants;

    return html`
      <div class="section">
        <div class="title">Ranking Settings</div>
        ${!waitForAllParticipants ? waitingWarning : ''}
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isParticipantRanking}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateRankingType}
          >
          </md-checkbox>
          <div>Ranking among participants (rather than items)</div>
        </div>
        ${isParticipantRanking
          ? html`
              <div class="checkbox-wrapper indented">
                <md-checkbox
                  touch-target="wrapper"
                  ?checked=${enableSelfVoting}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @click=${toggleSelfVoting}
                >
                </md-checkbox>
                <div>Enable self-selection in voting</div>
              </div>
            `
          : ''}

        <!-- New checkbox for election strategy -->
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isElection}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${toggleElectionStrategy}
          >
          </md-checkbox>
          <div>Conduct an election; compute a winner from the rankings</div>
        </div>

        ${isParticipantRanking ? nothing : this.renderRankingItems()}
      </div>
    `;
  }

  private renderRankingItems() {
    if (!this.stage || this.stage.rankingType !== 'items') return nothing;

    const itemsStage = this.stage as ItemRankingStage;
    const rankingItems: RankingItem[] = itemsStage.rankingItems || [];

    const addItem = () => {
      if (!this.stage) return;
      const newItems: RankingItem[] = [...rankingItems, createRankingItem()];
      this.experimentEditor.updateStage({
        ...this.stage,
        rankingItems: newItems,
      } as ItemRankingStage);
    };

    const updateItem = (index: number, e: InputEvent) => {
      if (!this.stage) return;
      const text = (e.target as HTMLTextAreaElement).value;
      const newItems: RankingItem[] = [...rankingItems];
      newItems[index].text = text;
      this.experimentEditor.updateStage({
        ...this.stage,
        rankingItems: newItems,
      } as ItemRankingStage);
    };

    const deleteItem = (index: number) => {
      if (!this.stage) return;
      const newItems: RankingItem[] = [
        ...rankingItems.slice(0, index),
        ...rankingItems.slice(index + 1),
      ];
      this.experimentEditor.updateStage({
        ...this.stage,
        rankingItems: newItems,
      } as ItemRankingStage);
    };

    return html`
      <div class="ranking-items">
        ${rankingItems.map(
          (item, index) => html`
            <div class="ranking-item">
              <pr-textarea
                placeholder="Add item for ranking"
                .value=${item.text}
                ?disabled=${!this.experimentEditor.canEditStages}
                @input=${(e: InputEvent) => updateItem(index, e)}
              ></pr-textarea>
              <pr-icon-button
                icon="delete"
                color="error"
                padding="small"
                variant="default"
                ?disabled=${!this.experimentEditor.canEditStages}
                @click=${() => deleteItem(index)}
              ></pr-icon-button>
            </div>
          `,
        )}
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${addItem}
        >
          Add item to rank
        </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ranking-editor': RankingEditorComponent;
  }
}
