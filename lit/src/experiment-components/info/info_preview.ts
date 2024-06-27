import "../../pair-components/textarea";

import "../footer/footer";
import "../progress/progress_stage_completed";


import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

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
    const descriptionContent = this.stage.description ? html`<div class="description">${this.stage.description}</div>` : nothing;

    return html`
      ${descriptionContent}
      
      <div class="html-wrapper">
        ${this.stage?.infoLines.map(line => this.renderInfoLine(line))}
      </div>
      <stage-footer>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderInfoLine(line: string) {
    return html`
      <div class="info-block">
        ${line}
      </div>
    `;
    }

}

declare global {
  interface HTMLElementTagNameMap {
    "info-preview": InfoPreview;
  }
}
