import "../../pair-components/icon_button";

import "@material/web/checkbox/checkbox.js";
import * as sanitizeHtml from "sanitize-html";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { TermsOfServiceStageConfig } from "@llm-mediation-experiments/utils";
import { Timestamp } from "firebase/firestore";

import { core } from "../../core/core";
import { ParticipantService } from "../../services/participant_service";

import { styles } from "./tos_preview.scss";

/** TOS preview */
@customElement("tos-preview")
export class TOSPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: TermsOfServiceStageConfig|null = null;

  override render() {
    if (!this.stage || this.participantService.profile === undefined) {
      return nothing;
    }

    const cleanHTML = sanitizeHtml(this.stage?.tosLines.join('\n\n'));

    const timestamp = this.participantService.profile?.acceptTosTimestamp;
    const handleTOSClick = () => {
      const acceptTosTimestamp = timestamp ? null : Timestamp.now();
      this.participantService.updateProfile({ acceptTosTimestamp });
    };

    return html`
      <div class="tos-wrapper">
        ${unsafeHTML(cleanHTML)}
      </div>
      <div class="ack-wrapper">
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            aria-label="Accept the Terms of Service"
            ?checked=${timestamp !== null}
            @click=${handleTOSClick}
          >
          </md-checkbox>
          I accept the Terms of Service
        </label>
        <div class="timestamp-wrapper">
          ${timestamp ?
            `Accepted at ${new Date(timestamp.seconds * 1000)}` : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tos-preview": TOSPreview;
  }
}
