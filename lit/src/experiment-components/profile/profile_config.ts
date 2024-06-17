import "../../pair-components/textarea";

import "@material/web/radio/radio.js";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";

import { styles } from "./profile_config.scss";

/** Participant profile config */
@customElement("profile-config")
export class ProfileConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    const handleNameInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      // TODO: Update profile
    };

    const handlePronounsInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      // TODO: Update profile
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Name"
        variant="outlined"
        @input=${handleNameInput}
      >
      </pr-textarea>
      <div class="radio-question">
        <div class="title">Pronouns</div>
        <div class="radio-button">
          <md-radio id="she" name="group" value="1"
              aria-label="she/her"></md-radio>
          <label for="she">she/her</label>
        </div>
        <div class="radio-button">
          <md-radio id="he" name="group" value="2"
              aria-label="he/him"></md-radio>
          <label for="he">he/him</label>
        </div>
        <div class="radio-button">
          <md-radio id="they" name="group" value="2"
              aria-label="they/them"></md-radio>
          <label for="they">they/them</label>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-config": ProfileConfig;
  }
}
