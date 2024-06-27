import "../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { InfoConfigService } from "../../services/config/info_config_service";

import { styles } from "./info_config.scss";

/** Info config */
@customElement("info-config")
export class InfoConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly infoConfig = core.getService(InfoConfigService);

  override render() {
    const handleNameInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.infoConfig.updateName(value);
    };
    
    const handleDescriptionInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.infoConfig.updateDescription(value);
    };

    const handleContentInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.infoConfig.updateContent(value);
    };

    return html`
      <pr-textarea
        label="Stage name"
        placeholder="Stage name"
        variant="outlined"
        .value=${this.infoConfig.name}
        @input=${handleNameInput}
      >
      </pr-textarea>

      <pr-textarea
      label="Stage description"
      placeholder="Stage description"
      variant="outlined"
      .value=${this.infoConfig.description}
      @input=${handleDescriptionInput}
      >
      </pr-textarea>

      <pr-textarea
        label="Content (in Git-Flavored Markdown)"
        placeholder="Add Markdown content here"
        variant="outlined"
        .value=${this.infoConfig.content}
        @input=${handleContentInput}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "info-config": InfoConfig;
  }
}
