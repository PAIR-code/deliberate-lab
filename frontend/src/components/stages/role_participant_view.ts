import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {RoleStageConfig, StageKind} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './info_view.scss';

/** Role stage view for participants. */
@customElement('role-participant-view')
export class RoleView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: RoleStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.ROLE) {
      return nothing;
    }

    const roleId =
      publicData.participantMap[
        this.participantService.profile?.publicId ?? ''
      ];
    const role = this.stage.roles.find((role) => role.id === roleId);

    const getRole = () => {
      this.participantService.setParticipantRoles(this.stage?.id ?? '');
    };

    const renderRoleDisplay = () => {
      if (!role) return nothing;
      return html`
        ${unsafeHTML(convertMarkdownToHTML(role.displayLines.join('\n\n')))}
      `;
    };

    const renderRoleButton = () => {
      return html`
        <pr-button @click=${getRole}>Get my participant role</pr-button>
      `;
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="html-wrapper">
        <div class="info-block">
          ${role ? renderRoleDisplay() : renderRoleButton()}
        </div>
      </div>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'role-view': RoleView;
  }
}
