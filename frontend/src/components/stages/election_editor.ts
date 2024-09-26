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
} from '@deliberation-lab/utils';

import {styles} from './election_editor.scss';

/** Editor for election stage. */
@customElement('election-editor')
export class ElectionEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: ElectionStageConfig|undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.renderElectionSettings()}
    `;
  }

  private renderElectionSettings() {
    if (!this.stage) return;
    const isParticipantElection = this.stage.isParticipantElection;

    const updateElection = () => {
      if (!this.stage) return;
      const isParticipantElection = !this.stage.isParticipantElection;
      this.experimentEditor.updateStage({ ...this.stage, isParticipantElection });
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
          <div>
            Election among participants
          </div>
        </div>
        ${isParticipantElection ? nothing : this.renderElectionItems()}
      </div>
    `;
  }

  private renderElectionItems() {
    if (!this.stage) return nothing;
    const electionItems: ElectionItem[] = this.stage.electionItems || [];

    const addItem = () => {
      if (!this.stage) return;
      const newItems: ElectionItem[] = [...electionItems, createElectionItem()];
      this.experimentEditor.updateStage({ ...this.stage, electionItems: newItems });
    };

    const updateItem = (index: number, e: InputEvent) => {
      if (!this.stage) return;
      const text = (e.target as HTMLTextAreaElement).value;
      const newItems: ElectionItem[] = [...electionItems];
      newItems[index].text = text;
      this.experimentEditor.updateStage({ ...this.stage, electionItems: newItems });
    };

    const deleteItem = (index: number) => {
      if (!this.stage) return;
      const newItems: ElectionItem[] = [...electionItems.slice(0, index), ...electionItems.slice(index + 1)];
      this.experimentEditor.updateStage({ ...this.stage, electionItems: newItems });
    };

    return html`
      <div class="election-items">
        ${electionItems.map((item, index) => html`
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
        `)}
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
