import "../../pair-components/button";
import "../../pair-components/textarea";
import "../profile/profile_avatar";

import "@material/web/radio/radio.js";

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { MediatorConfigService } from "../../services/config/mediator_config_service";

import {
  MediatorConfig,
  MediatorKind
} from "@llm-mediation-experiments/utils";

import { LLM_MEDIATOR_AVATARS } from "../../shared/constants";

import { styles } from "./mediator_config.scss";

/** LLM mediators config */
@customElement("mediators-config")
export class Mediators extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly mediatorConfigService = core.getService(MediatorConfigService);

  override render() {
    const onAddMediator = () => {
      this.mediatorConfigService.addMediator();
    }

    return html`
      <pr-button @click=${onAddMediator}>Add mediator</pr-button>
      ${this.mediatorConfigService.mediators.map(
        (mediator: MediatorConfig) => this.renderMediator(mediator)
      )}
    `;
  }

  private renderMediator(mediator: MediatorConfig) {
    const onDelete = () => {
      this.mediatorConfigService.deleteMediator(mediator.id);
    };

    return html`
      <details class="mediator-wrapper">
        <summary class="mediator-title">
          ${mediator.name}
        </summary>
        <div class="mediator-config">
          <mediator-config .mediator=${mediator}></mediator-config>
          <pr-button color="error" variant="default" @click=${onDelete}>
            Delete mediator
          </pr-button>
        </div>
      </details>
    `;
  }
}

/** LLM mediator config */
@customElement("mediator-config")
export class Mediator extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly mediatorConfigService = core.getService(MediatorConfigService);

  @property() mediator: MediatorConfig|null = null;
  @property() showKind = true;

  override render() {
    if (this.mediator === null) {
      return nothing;
    }

    return html`
      ${this.renderName(this.mediator)}
      ${this.renderModel(this.mediator)}
      ${this.renderAvatars(this.mediator)}
      ${this.showKind ? this.renderKind(this.mediator) : nothing}
      ${this.renderPrompt(this.mediator)}
    `;
  }

  private renderName(mediator: MediatorConfig) {
    const handleNameInput = (e: Event) => {
      const name = (e.target as HTMLTextAreaElement).value;
      mediator.name = name;
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Name"
        variant="outlined"
        .value=${mediator.name}
        @input=${handleNameInput}
      >
      </pr-textarea>
    `;
  }

  private renderPrompt(mediator: MediatorConfig) {
    const handlePromptInput = (e: Event) => {
      const prompt = (e.target as HTMLTextAreaElement).value;
      mediator.prompt = prompt;
    };

    return html`
      <pr-textarea
        label="Prompt"
        placeholder="Prompt"
        variant="outlined"
        .value=${mediator.prompt}
        @input=${handlePromptInput}
      >
      </pr-textarea>
    `;
  }

  private renderModel(mediator: MediatorConfig) {
    const handleModelInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      switch (value) {
        case "1":
          mediator.model = "gemini-1.5-pro-latest";
          return;
        case "2":
          mediator.model = "gemini-1.5-flash";
          return;
        default:
          return;
      }
    };

    const isMatch = (model: string) => {
      return mediator.model === model;
    }

    return html`
      <div class="radio-question">
        <div class="title">Model</div>
        <div class="radio-wrapper">
          <div class="radio-button">
            <md-radio
              id="gemini-1.5-pro-latest"
              name="${mediator.id}-model"
              value="1"
              aria-label="gemini-1.5-pro-latest"
              ?checked=${isMatch("gemini-1.5-pro-latest")}
              @change=${handleModelInput}>
            </md-radio>
            <label for="gemini-1.5-pro-latest">gemini-1.5-pro-latest</label>
          </div>
          <div class="radio-button">
            <md-radio
              id="gemini-1.5-flash"
              name="${mediator.id}-model"
              value="2"
              aria-label="gemini-1.5-flash"
              ?checked=${isMatch("gemini-1.5-flash")}
              @change=${handleModelInput}
            >
            </md-radio>
            <label for="gemini-1.5-flash">gemini-1.5-flash</label>
          </div>
        </div>
      </div>
    `;
  }

  private renderKind(mediator: MediatorConfig) {
    const handleInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      switch (value) {
        case "1":
          mediator.kind = MediatorKind.Automatic;
          return;
        case "2":
          mediator.kind = MediatorKind.Manual;
        default:
          return;
      }
    };

    const isMatch = (kind: string) => {
      return mediator.kind === kind;
    }

    return html`
      <div class="radio-question">
        <div class="title">Mediation Style</div>
        <div class="radio-wrapper">
          <div class="radio-button">
            <md-radio
              id="automatic"
              name="${mediator.id}-kind"
              value="1"
              aria-label="automatic"
              ?checked=${isMatch("automatic")}
              @change=${handleInput}>
            </md-radio>
            <label for="automatic">Automatic (automatically responds)</label>
          </div>
          <div class="radio-button">
            <md-radio
              id="manual"
              name="${mediator.id}-kind"
              value="2"
              aria-label="manual"
              ?checked=${isMatch("manual")}
              @change=${handleInput}
            >
            </md-radio>
            <label for="manual">Manual (experimenters click to send)</label>
          </div>
        </div>
      </div>
    `;
  }

  private renderAvatars(mediator: MediatorConfig) {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_MEDIATOR_AVATARS[value];
      mediator.avatar = avatar;
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="${mediator.id}-avatar"
            value=${index}
            aria-label=${emoji}
            ?checked=${mediator.avatar === emoji}
            @change=${handleAvatarClick}
          >
          </md-radio>
          <profile-avatar .emoji=${emoji} .square=${true}></profile-avatar>
        </div>
      `;
    };

    return html`
      <div class="radio-question">
        <div class="title">Avatar</div>
        <div class="radio-wrapper">
          ${LLM_MEDIATOR_AVATARS.map(
            (avatar, index) => renderAvatarRadio(avatar, index)
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mediators-config": Mediators;
    "mediator-config": Mediator;
  }
}
