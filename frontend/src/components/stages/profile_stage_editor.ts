import '../../pair-components/textarea';

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

    return html`${this.renderAnonymousToggle()}`;
  }

  private renderAnonymousToggle() {
    if (!this.stage) {
      return;
    }
    const isAnonymous = this.stage.profileType === ProfileType.ANONYMOUS_ANIMAL;

    const toggleAnonymous = () => {
      if (!this.stage) return;
      const profileType = isAnonymous
        ? ProfileType.DEFAULT
        : ProfileType.ANONYMOUS_ANIMAL;

      this.experimentEditor.updateStage({...this.stage, profileType});
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${isAnonymous}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${toggleAnonymous}
        >
        </md-checkbox>
        <div>
          🐱 Generate anonymous profiles.
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
