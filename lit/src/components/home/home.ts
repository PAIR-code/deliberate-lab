import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { styles } from "./home.scss";

/** Home page component */
@customElement("home-page")
export class Home extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  override render() {
    return html`
      <p>Home page content goes here</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": Home;
  }
}
