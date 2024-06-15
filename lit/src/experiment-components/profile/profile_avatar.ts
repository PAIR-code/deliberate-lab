import "../../pair-components/textarea";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { styles } from "./profile_avatar.scss";

/** Participant profile avatar */
@customElement("profile-avatar")
export class ProfileAvatar extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() emoji = "";
  @property() square = false;

  override render() {
    const classes = classMap({
      "avatar": true,
      "square": this.square,
      "man": ['👨🏻','👨🏼','👨🏽','👨🏾','👨🏿'].indexOf(this.emoji) > -1,
      "woman": ['👩🏻','👩🏼','👩🏽','👩🏾','👩🏿'].indexOf(this.emoji) > -1,
      "person": ['🧑🏻','🧑🏼','🧑🏽','🧑🏾','🧑🏿'].indexOf(this.emoji) > -1,
    });

    return html`
      <div class=${classes}>
        ${this.emoji}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-avatar": ProfileAvatar;
  }
}
