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
      <p>Placeholder for home page content.</p>
      <p>
        This could potentially include all experiments (with the ability
        to set any of them to the current experiment available in sidebar).
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-page": Home;
  }
}
