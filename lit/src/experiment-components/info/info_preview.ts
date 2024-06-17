import "../../pair-components/textarea";

import "../footer/footer";
import "../progress/progress_stage_completed";

import * as sanitizeHtml from "sanitize-html";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { InfoStageConfig } from "@llm-mediation-experiments/utils";

import { styles } from "./info_preview.scss";

/** Info preview */
@customElement("info-preview")
export class InfoPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: InfoStageConfig|null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const cleanHTML = sanitizeHtml(this.stage?.infoLines.join('\n\n'));
    return html`
      <div class="html-wrapper">
        ${unsafeHTML(cleanHTML)}
      </div>
      <stage-footer>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "info-preview": InfoPreview;
  }
}
