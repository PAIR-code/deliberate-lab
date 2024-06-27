import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { SettingsService } from "../../services/settings_service";

import { ColorMode, ColorTheme, TextSize } from "../../shared/types";

import { styles } from "./settings.scss";

/** Settings page component */
@customElement("settings-page")
export class Settings extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly settingsService = core.getService(SettingsService);

  @property() showAccount = false;

  override render() {
    return html`
      <div class="settings">
        ${this.renderColorModeSection()}
        ${this.renderColorThemeSection()}
        ${this.renderTextSizeSection()}
        ${this.renderAccountSection()}
        ${this.renderAppVersionSection()}
      </div>
    `;
  }

  private renderColorModeSection() {
    const handleClick = (mode: ColorMode) => {
      this.settingsService.setColorMode(mode);
    };

    const isMode = (mode: ColorMode) => {
      return this.settingsService.colorMode === mode;
    };

    return html`
      <div class="section">
        <h2>Color Mode</h2>
        <div class="action-buttons">
          <pr-button
            color=${isMode(ColorMode.LIGHT)
              ? "primary"
              : "neutral"}
            variant=${isMode(ColorMode.LIGHT)
              ? "tonal"
              : "default"}
            @click=${() => {
              handleClick(ColorMode.LIGHT);
            }}
          >
            Light
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DARK)
              ? "primary"
              : "neutral"}
            variant=${isMode(ColorMode.DARK)
              ? "tonal"
              : "default"}
            @click=${() => {
              handleClick(ColorMode.DARK);
            }}
          >
            Dark
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DEFAULT)
              ? "primary"
              : "neutral"}
            variant=${isMode(ColorMode.DEFAULT)
              ? "tonal"
              : "default"}
            @click=${() => {
              handleClick(ColorMode.DEFAULT);
            }}
          >
            System Default
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderColorThemeSection() {
    const handleClick = (theme: ColorTheme) => {
      this.settingsService.setColorTheme(theme);
    };

    const isTheme = (theme: ColorTheme) => {
      return this.settingsService.colorTheme === theme;
    };

    return html`
      <div class="section">
        <h2>Color Theme</h2>
        <div class="action-buttons">
          <pr-button
            color=${isTheme(ColorTheme.KAMINO)
              ? "primary"
              : "neutral"}
            variant=${isTheme(ColorTheme.KAMINO)
              ? "tonal"
              : "default"}
            @click=${() => {
              handleClick(ColorTheme.KAMINO);
            }}
          >
            Kamino
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderTextSizeSection() {
    const handleClick = (size: TextSize) => {
      this.settingsService.setTextSize(size);
    };

    const isSize = (size: TextSize) => {
      return this.settingsService.textSize === size;
    };

    return html`
      <div class="section">
        <h2>Text Size</h2>
        <div class="action-buttons">
          <pr-button
            color=${isSize(TextSize.SMALL) ? "primary" : "neutral"}
            variant=${isSize(TextSize.SMALL) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.SMALL);
            }}
          >
            Small
          </pr-button>
          <pr-button
            color=${isSize(TextSize.MEDIUM) ? "primary" : "neutral"}
            variant=${isSize(TextSize.MEDIUM) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.MEDIUM);
            }}
          >
            Medium
          </pr-button>
          <pr-button
            color=${isSize(TextSize.LARGE) ? "primary" : "neutral"}
            variant=${isSize(TextSize.LARGE) ? "tonal" : "default"}
            @click=${() => {
              handleClick(TextSize.LARGE);
            }}
          >
            Large
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderAccountSection() {
    if (!this.showAccount) {
      return nothing;
    }

    const handleSignOut = () => {
      this.authService.signOut();
    };

    return html`
      <div class="section">
        <h2>Account</h2>
        <p><b>User ID:</b> ${this.authService.userId}</p>
        <p>
          <b>Role:</b>
          ${this.authService.isExperimenter ? 'experimenter' : 'participant'}
        </p>
        <div class="action-buttons">
          <pr-button
            color="error"
            variant="outlined"
            @click=${handleSignOut}>
            Log out
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderAppVersionSection() {

    return html`
      <div class="section">
        <h2>App version</h2>
        <p><b>Branch:</b> ${GIT_BRANCH}</p>
        <p><b>Commit:</b> 
          <a href="https://github.com/PAIR-code/llm-mediation-experiments/commit/${GIT_COMMIT_HASH}" target="_blank">${GIT_VERSION}</a>
        </p>
        <p><b>Commit Date:</b> ${new Date(GIT_LAST_COMMIT_DATETIME)}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "settings-page": Settings;
  }
}
