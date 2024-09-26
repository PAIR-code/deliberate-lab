import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import '@material/web/checkbox/checkbox.js';
import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';

import {TOSStageConfig} from '@deliberation-lab/utils';
import {
  convertMarkdownToHTML,
  convertUnifiedTimestampToDate
} from '../../shared/utils';
import {styles} from './tos_view.scss';

/** TOS stage view for participants. */
@customElement('tos-view')
export class TOSView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: TOSStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const timestamp = this.participantService.profile?.timestamps.acceptedTOS;
    const handleTOSClick = () => {
      if (!this.participantService.profile) return;
      const acceptedTOS = timestamp ? null : Timestamp.now();
      // Update participant progress timestamps
      const timestamps = {
        ...this.participantService.profile.timestamps,
        acceptedTOS
      };
      this.participantService.updateProfile({timestamps});
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="html-wrapper">
        ${this.stage?.tosLines.map((line) => this.renderTOSLine(line))}
      </div>
      <div class="ack-wrapper">
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            aria-label="Accept the Terms of Service"
            ?checked=${timestamp !== null}
            ?disabled=${this.participantService.disableStage}
            @click=${handleTOSClick}
          >
          </md-checkbox>
          I accept the Terms of Service
        </label>
        <div class="timestamp-wrapper">
          ${timestamp
            ? `Accepted at ${convertUnifiedTimestampToDate(timestamp)}`
            : nothing}
        </div>
      </div>
      <stage-footer .disabled=${!timestamp}>
      </stage-footer>
    `;
  }

  private renderTOSLine(line: string) {
    return html`
      <div class="tos-block">${unsafeHTML(convertMarkdownToHTML(line))}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tos-view': TOSView;
  }
}
