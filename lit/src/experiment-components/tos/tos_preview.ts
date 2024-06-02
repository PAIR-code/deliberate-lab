import "../../pair-components/icon_button";

import * as sanitizeHtml from "sanitize-html";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { TermsOfServiceStageConfig } from "../../shared/types";

import { styles } from "./tos_preview.scss";

/** TOS preview */
@customElement("tos-preview")
export class TOSPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: TermsOfServiceStageConfig|null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const cleanHTML = sanitizeHtml(this.stage?.tosLines.join('\n\n'));
    return html`
      <div class="tos-wrapper">
        ${unsafeHTML(cleanHTML)}
      </div>
      <div class="ack-wrapper">
        <pr-icon-button
          color="neutral"
          icon="check_box_outline_blank"
          variant="default"
          disabled
        >
        </pr-icon-button>
        <div>I acknowledge the Terms of Service</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tos-preview": TOSPreview;
  }
}
