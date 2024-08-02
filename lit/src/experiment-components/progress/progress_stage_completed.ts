import '../../pair-components/tooltip';
import '../profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {RouterService} from '../../services/router_service';

import {ParticipantProfile} from '@llm-mediation-experiments/utils';
import {styles} from './progress_end_chat.scss';
import {PARTICIPANT_COMPLETION_TYPE} from '@llm-mediation-experiments/utils';

/** Progress component: Shows how many participants completed the stage */
@customElement('progress-stage-completed')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() showAvatars = true;
  @property() stageId = this.routerService.activeRoute.params['stage'];

  override render() {
    // Don't render participant progress for the lobby.
    if (this.experimentService.experiment?.lobbyConfig.isLobby) {
      return;
    }

    const {completed, notCompleted} =
      this.experimentService.getParticipantsCompletedStage(this.stageId);

    return html` ${this.showAvatars
      ? completed
          .sort((p1, p2) => p1.publicId.localeCompare(p2.publicId))
          .map((participant) => this.renderAvatar(participant))
      : nothing}
    ${this.experimentService.experiment?.lobbyConfig.isLobby!
      ? ''
      : html`<div>
          ${completed.length} of ${completed.length + notCompleted.length}
          participants completed this stage
        </div>`}`;
  }

  private renderAvatar(participant: ParticipantProfile) {
    const inactiveLabel = 'This participant is no longer active.';
    const participantLabel = `
      ${participant.name ?? participant.publicId}
      ${participant.pronouns ? `(${participant.pronouns})` : ''}
    `;

    return html`
      <pr-tooltip
        text=${participant.completedExperiment &&
        participant.completionType !== PARTICIPANT_COMPLETION_TYPE.SUCCESS
          ? inactiveLabel
          : participantLabel}
      >
        <profile-avatar
          .emoji=${participant.avatarUrl}
          .small=${true}
          .disabled=${participant.completedExperiment}
        >
        </profile-avatar>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'progress-stage-completed': Progress;
  }
}
