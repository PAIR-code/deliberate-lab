import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  CohortConfig
} from '@deliberation-lab/utils';

import {styles} from './cohort_settings_dialog.scss';

/** Cohort settings dialog */
@customElement('cohort-settings-dialog')
export class CohortSettingsDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    if (!this.experimentManager.cohortEditing) {
      return nothing;
    }

    return html`
      <div class="dialog">
        <div class="header">
          <div>Edit cohort</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${() => { this.experimentManager.setCohortEditing(undefined); }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          ${this.renderName()}
          ${this.renderDescription()}
        </div>
        <div class="footer">
          <pr-button
            @click=${() => {
              this.experimentManager.writeCohort(
                this.experimentManager.cohortEditing
              );
              this.experimentManager.setCohortEditing(undefined);
            }}
          >
            Save
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderName() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      const cohort = this.experimentManager.cohortEditing;

      if (!cohort) {
        return;
      }

      this.experimentManager.setCohortEditing(
        {
          ...cohort,
          metadata: {...cohort.metadata, name}
        }
      )
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Cohort name"
        variant="outlined"
        .value=${this.experimentManager.cohortEditing?.metadata.name ?? ''}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderDescription() {
    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      const cohort = this.experimentManager.cohortEditing;

      if (!cohort) {
        return;
      }

      this.experimentManager.setCohortEditing(
        {
          ...cohort,
          metadata: {...cohort.metadata, description}
        }
      )
    };

    return html`
      <pr-textarea
        label="Description"
        placeholder="Cohort description"
        variant="outlined"
        .value=${this.experimentManager.cohortEditing?.metadata.description ?? ''}
        @input=${updateDescription}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-settings-dialog': CohortSettingsDialog;
  }
}
