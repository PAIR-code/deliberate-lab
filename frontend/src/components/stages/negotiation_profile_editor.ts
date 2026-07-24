import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '../../pair-components/button';
import '@material/web/textfield/outlined-text-field.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  NegotiationProfileItem,
  NegotiationProfileStageConfig,
  createNegotiationProfileItem,
} from '@deliberation-lab/utils';

import {styles} from './role_editor.scss';

/** Editor for negotiation profile stage. */
@customElement('negotiation-profile-editor')
export class NegotiationProfileEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: NegotiationProfileStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.stage.items.map((item, index) =>
        this.renderProfileItem(item, index),
      )}
      ${this.renderAddItemButton()}
    `;
  }

  private renderAddItemButton() {
    const addButton = () => {
      if (!this.stage) return;

      const items = [...this.stage.items, createNegotiationProfileItem()];
      this.experimentEditor.updateStage({...this.stage, items});
    };

    return html` <pr-button @click=${addButton}> Add new profile </pr-button> `;
  }

  private renderProfileItem(item: NegotiationProfileItem, index: number) {
    const updateItem = (config: Partial<NegotiationProfileItem>) => {
      if (!this.stage) return;

      const items = [
        ...this.stage.items.slice(0, index),
        {...item, ...config},
        ...this.stage.items.slice(index + 1),
      ];
      this.experimentEditor.updateStage({...this.stage, items});
    };

    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      updateItem({name});
    };

    const updateAvatar = (e: InputEvent) => {
      const avatar = (e.target as HTMLTextAreaElement).value;
      updateItem({avatar});
    };

    const updateDisplayLines = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      updateItem({displayLines: value ? [value] : []});
    };

    return html`
      <div class="role">
        <div class="subtitle">Profile ID: ${item.id}</div>
        <md-outlined-text-field
          required
          label="Profile name (e.g. Party A)"
          placeholder="Party A"
          .error=${item.name.length === 0}
          .value=${item.name}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateName}
        >
        </md-outlined-text-field>
        <md-outlined-text-field
          label="Avatar emoji (leave blank to hide avatar)"
          placeholder="Leave blank for no avatar"
          .value=${item.avatar}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateAvatar}
        >
        </md-outlined-text-field>
        <md-outlined-text-field
          type="textarea"
          rows="3"
          label="Information to display when assigned (optional markdown)"
          placeholder="You have been assigned to Party A..."
          .value=${item.displayLines.join('\n\n') ?? ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateDisplayLines}
        >
        </md-outlined-text-field>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'negotiation-profile-editor': NegotiationProfileEditorComponent;
  }
}
