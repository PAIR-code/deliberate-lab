import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '../../pair-components/button';
import '@material/web/textfield/outlined-text-field.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  RoleItem,
  RoleStageConfig,
  StageKind,
  createRoleItem,
} from '@deliberation-lab/utils';

import {styles} from './role_editor.scss';

/** Editor for role stage. */
@customElement('role-editor')
export class RoleEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: RoleStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.stage.roles.map((role, index) => this.renderRoleItem(role, index))}
      ${this.renderAddRoleButton()}
    `;
  }

  private renderAddRoleButton() {
    const addButton = () => {
      if (!this.stage) return;

      const roles = [...this.stage.roles, createRoleItem()];
      this.experimentEditor.updateStage({...this.stage, roles});
    };

    return html` <pr-button @click=${addButton}> Add new role </pr-button> `;
  }

  private renderRoleItem(role: RoleItem, index: number) {
    const updateRoleItem = (config: Partial<RoleItem>) => {
      if (!this.stage) return;

      const roles = [
        ...this.stage.roles.slice(0, index),
        {...role, ...config},
        ...this.stage.roles.slice(index + 1),
      ];
      this.experimentEditor.updateStage({...this.stage, roles});
    };

    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      updateRoleItem({name});
    };

    const updateDisplayLines = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      updateRoleItem({displayLines: [value]});
    };

    const updateMinParticipants = (e: InputEvent) => {
      const minParticipants = Number((e.target as HTMLTextAreaElement).value);
      updateRoleItem({minParticipants});
    };

    const updateMaxParticipantsNumber = (e: InputEvent) => {
      const maxParticipants = Number((e.target as HTMLTextAreaElement).value);
      updateRoleItem({maxParticipants});
    };

    const toggleMaxParticipants = () => {
      if (role.maxParticipants === null) {
        updateRoleItem({maxParticipants: 100});
      } else {
        updateRoleItem({maxParticipants: null});
      }
    };

    return html`
      <div class="role">
        <div class="subtitle">Role ID: ${role.id}</div>
        <md-outlined-text-field
          required
          label="Name of role"
          placeholder="Add name of role"
          .error=${role.name.length === 0}
          .value=${role.name}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateName}
        >
        </md-outlined-text-field>
        <md-outlined-text-field
          label="Minimum number of participants"
          type="number"
          id="minParticipants"
          name="minParticipants"
          min="0"
          .value=${role.minParticipants ?? 0}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateMinParticipants}
        >
        </md-outlined-text-field>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${role.maxParticipants !== null}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${toggleMaxParticipants}
          >
          </md-checkbox>
          <div>Set maximum number of participants assigned to this role</div>
        </div>
        <md-outlined-text-field
          label="Maximum number of participants"
          type="number"
          id="maxParticipants"
          name="maxParticipants"
          min="0"
          .value=${role.maxParticipants ?? 100}
          ?disabled=${!this.experimentEditor.canEditStages ||
          role.maxParticipants === null}
          @input=${updateMaxParticipantsNumber}
        >
        </md-outlined-text-field>
        <md-outlined-text-field
          required
          type="textarea"
          rows="5"
          label="Information to display to role"
          placeholder="Add info to display to role"
          .error=${role.displayLines.length === 0}
          .value=${role.displayLines.join('\n\n') ?? ''}
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
    'role-editor': RoleEditorComponent;
  }
}
