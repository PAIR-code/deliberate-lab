import '../../pair-components/textarea';
import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/checkbox/checkbox.js';
import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {
  ElectionStageConfig,
  ElectionItem,
  createElectionItem,
  ParticipantElectionStage,
  ItemElectionStage,
} from '@deliberation-lab/utils';
import {styles} from './election_editor.scss';

/** Editor for election stage. */
@customElement('election-editor')
export class ElectionEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: ElectionStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }
    return html` ${this.renderElectionSettings()} `;
  }
  private renderElectionSettings() {
    if (!this.stage) return;

    const isParticipantElection = this.stage.electionType === 'participants';
    const enableSelfVoting = (this.stage as ParticipantElectionStage)
      .enableSelfVoting;

    const updateElection = () => {
      if (!this.stage) return;
      const newType = isParticipantElection ? 'items' : 'participants';
      const updatedStage = {...this.stage, electionType: newType} as
        | ParticipantElectionStage
        | ItemElectionStage;
      if (newType === 'participants') {
        (updatedStage as ParticipantElectionStage).enableSelfVoting = false; // Reset self-voting if switched to non-participant election
      }
      this.experimentEditor.updateStage(updatedStage);
    };

    const toggleSelfVoting = () => {
      if (!this.stage) return;
      const updatedStage = {
        ...this.stage,
        enableSelfVoting: !enableSelfVoting,
      } as ParticipantElectionStage;
      this.experimentEditor.updateStage(updatedStage);
    };

    return html`
      <div class="section">
        <div class="title">Election Settings</div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isParticipantElection}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateElection}
          >
          </md-checkbox>
          <div>Ranking among participants (rather than items)</div>
        </div>
        ${isParticipantElection
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
        ${isParticipantElection ? nothing : this.renderElectionItems()}
      </div>
    `;
  }

  private renderElectionItems() {
    if (!this.stage || this.stage.electionType !== 'items') return nothing;

    const itemsStage = this.stage as ItemElectionStage;
    const electionItems: ElectionItem[] = itemsStage.electionItems || [];

    const addItem = () => {
      if (!this.stage) return;
      const newItems: ElectionItem[] = [...electionItems, createElectionItem()];
      this.experimentEditor.updateStage({
        ...this.stage,
        electionItems: newItems,
      } as ItemElectionStage);
    };

    const updateItem = (index: number, e: InputEvent) => {
      if (!this.stage) return;
      const text = (e.target as HTMLTextAreaElement).value;
      const newItems: ElectionItem[] = [...electionItems];
      newItems[index].text = text;
      this.experimentEditor.updateStage({
        ...this.stage,
        electionItems: newItems,
      } as ItemElectionStage);
    };

    const deleteItem = (index: number) => {
      if (!this.stage) return;
      const newItems: ElectionItem[] = [
        ...electionItems.slice(0, index),
        ...electionItems.slice(index + 1),
      ];
      this.experimentEditor.updateStage({
        ...this.stage,
        electionItems: newItems,
      } as ItemElectionStage);
    };

    return html`
      <div class="election-items">
        ${electionItems.map(
          (item, index) => html`
            <div class="election-item">
              <pr-textarea
                placeholder="Add election item"
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
          `
        )}
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${addItem}
        >
          Add Election Item
        </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'election-editor': ElectionEditorComponent;
  }
}
