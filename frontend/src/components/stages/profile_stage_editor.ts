import '../../pair-components/textarea';
import '@material/web/radio/radio';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ProfileType,
  ProfileStageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './profile_stage_editor.scss';

export const SET_PROFILE_STAGE_DEFAULT_NAME = 'Set profile';
export const VIEW_PROFILE_STAGE_DEFAULT_NAME = 'View randomly assigned profile';

/** Editor for info stage. */
@customElement('profile-stage-editor')
export class ProfileStageEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: ProfileStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`${this.renderProfileOptions()}`;
  }

  private renderProfileOptions() {
    if (!this.stage) {
      return;
    }

    const handleProfileTypeChange = (profileType: ProfileType) => {
      if (!this.stage) return;
      let stageName = this.stage.name;

      if (
        profileType === ProfileType.DEFAULT ||
        profileType === ProfileType.DEFAULT_GENDERED
      ) {
        // Update default stage name.
        if (this.stage.name === VIEW_PROFILE_STAGE_DEFAULT_NAME) {
          stageName = SET_PROFILE_STAGE_DEFAULT_NAME;
        }
      } else {
        if (this.stage.name === SET_PROFILE_STAGE_DEFAULT_NAME) {
          stageName = VIEW_PROFILE_STAGE_DEFAULT_NAME;
        }
      }
      this.experimentEditor.updateStage({
        ...this.stage,
        profileType,
        name: stageName,
      });
    };

    return html`
      <div class="profile-options">
        <div class="profile-option">
          <md-radio
            name="profile-type"
            value="default"
            ?checked=${this.stage.profileType === ProfileType.DEFAULT}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${() => handleProfileTypeChange(ProfileType.DEFAULT)}
          ></md-radio>
          <label>Let participants set their own profiles</label>
        </div>
        <div class="profile-option">
          <md-radio
            name="profile-type"
            value="default-gendered"
            ?checked=${this.stage.profileType === ProfileType.DEFAULT_GENDERED}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${() =>
              handleProfileTypeChange(ProfileType.DEFAULT_GENDERED)}
          ></md-radio>
          <label>Let participants choose from the default gendered set</label>
        </div>
        <div class="profile-option">
          <md-radio
            name="profile-type"
            value="animal"
            ?checked=${this.stage.profileType === ProfileType.ANONYMOUS_ANIMAL}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${() =>
              handleProfileTypeChange(ProfileType.ANONYMOUS_ANIMAL)}
          ></md-radio>
          <label>🐱 Generate anonymous animal-themed profiles</label>
        </div>
        <div class="profile-option">
          <md-radio
            name="profile-type"
            value="participant"
            ?checked=${this.stage.profileType ===
            ProfileType.ANONYMOUS_PARTICIPANT}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${() =>
              handleProfileTypeChange(ProfileType.ANONYMOUS_PARTICIPANT)}
          ></md-radio>
          <label
            >👤 Generate anonymous participant profiles (Participant 1, 2,
            ...)</label
          >
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'profile-stage-editor': ProfileStageEditorComponent;
  }
}
