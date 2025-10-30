import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {InfoStageConfig, resolveTemplate} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './info_view.scss';
import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';

/** Info stage view for participants. */
@customElement('info-view')
export class InfoView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: InfoStageConfig | null = null;

  private readonly participantService = core.getService(ParticipantService);

  override render() {
    if (!this.stage) {
      return nothing;
    }

    // Resolve templates in info lines using participant variables
    const resolvedInfoLines = this.stage.infoLines.map((line) =>
      resolveTemplate(line, this.participantService.variables),
    );
    const infoLinesJoined = resolvedInfoLines.join('\n\n');
    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="html-wrapper">
        <div class="info-block">
          ${unsafeHTML(convertMarkdownToHTML(infoLinesJoined))}
        </div>
        ${this.stage.youtubeVideoId
          ? html`
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/${this.stage.youtubeVideoId}"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              >
              </iframe>
            `
          : nothing}
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
    'info-view': InfoView;
  }
}
