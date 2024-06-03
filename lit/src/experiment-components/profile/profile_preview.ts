import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ParticipantProfileExtended } from "@llm-mediation-experiments/utils";

import { styles } from "./profile_preview.scss";

/** Full participant profile preview */
@customElement("profile-preview")
export class ProfilePreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() profile: ParticipantProfileExtended|null = null;

  override render() {
    if (!this.profile) {
      return nothing;
    }
    return html`
      <div><b>Name:</b> ${this.profile.name}</div>
      <div><b>Pronouns:</b> ${this.profile.pronouns}</div>
      <div><b>Current stage:</b> ${this.profile.workingOnStageName}</div>
      <div><b>Terms of Service:</b> ${this.profile.acceptTosTimestamp}</div>
      <div><b>Public ID:</b> ${this.profile.publicId}</div>
      <div><b>Private ID:</b> ${this.profile.privateId}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-preview": ProfilePreview;
  }
}
