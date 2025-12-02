import '../../pair-components/button';

import '../experimenter/experimenter_data_editor';
import './dl_api_key_manager';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {SettingsService} from '../../services/settings.service';

import {ColorMode} from '../../shared/types';

import {styles} from './settings.scss';

/** Settings page component */
@customElement('settings-page')
export class Settings extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly settingsService = core.getService(SettingsService);

  @property() showAccount = false;

  override render() {
    return html`
      <div class="settings">
        ${this.renderColorModeSection()}
        ${this.authService.isExperimenter
          ? this.renderExperimenterData()
          : nothing}

        <alpha-toggle></alpha-toggle>
        ${this.authService.isExperimenter && this.authService.showAlphaFeatures
          ? this.renderAPIKeySection()
          : nothing}
        ${this.authService.isExperimenter
          ? this.renderAppVersionSection()
          : nothing}
        ${this.renderReferenceSection()} ${this.renderAccountSection()}
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
            color=${isMode(ColorMode.LIGHT) ? 'primary' : 'neutral'}
            variant=${isMode(ColorMode.LIGHT) ? 'tonal' : 'default'}
            @click=${() => {
              handleClick(ColorMode.LIGHT);
            }}
          >
            Light
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DARK) ? 'primary' : 'neutral'}
            variant=${isMode(ColorMode.DARK) ? 'tonal' : 'default'}
            @click=${() => {
              handleClick(ColorMode.DARK);
            }}
          >
            Dark
          </pr-button>
          <pr-button
            color=${isMode(ColorMode.DEFAULT) ? 'primary' : 'neutral'}
            variant=${isMode(ColorMode.DEFAULT) ? 'tonal' : 'default'}
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
        <p><b>Email:</b> ${this.authService.userEmail}</p>
        <p><b>User ID:</b> ${this.authService.userId}</p>
        <p>
          <b>Role:</b>
          ${this.authService.isExperimenter ? 'experimenter' : 'participant'}
        </p>
        <div class="action-buttons">
          <pr-button color="error" variant="outlined" @click=${handleSignOut}>
            Log out
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderAppVersionSection() {
    if (!this.showAccount) {
      return nothing;
    }

    return html`
      <div class="section">
        <h2>App version</h2>
        <p><b>Branch:</b> ${GIT_BRANCH}</p>
        <p>
          <b>Commit:</b>
          <a
            href="https://github.com/PAIR-code/llm-mediation-experiments/commit/${GIT_COMMIT_HASH}"
            target="_blank"
            >${GIT_VERSION}</a
          >
        </p>
        <p><b>Commit Date:</b> ${new Date(GIT_LAST_COMMIT_DATETIME)}</p>
      </div>
    `;
  }

  private renderExperimenterData() {
    return html`
      <div class="section">
        <h2>LLM API Integration</h2>
        <p>Manage API keys for LLM integrations within experiments.</p>
        <experimenter-data-editor></experimenter-data-editor>
      </div>
    `;
  }

  private renderAPIKeySection() {
    return html`
      <div class="section">
        <h2>Deliberate Lab API Access</h2>
        <p>
          Manage Deliberate Lab API keys for programmatic access to your
          experiments via the
          <a
            href="https://pair-code.github.io/deliberate-lab/developers/api"
            target="_blank"
            >REST API</a
          >.
        </p>
        <dl-api-key-manager></dl-api-key-manager>
      </div>
    `;
  }

  private renderReferenceSection() {
    return html`
      <div class="section">
        <div class="action-buttons">
          <pr-button
            color="secondary"
            variant="tonal"
            @click=${() =>
              window.open(
                `https://github.com/PAIR-code/deliberate-lab/wiki/Getting-started-(for-researchers)`,
                '_blank',
              )}
          >
            📚 View the documentation
          </pr-button>
          <pr-button
            color="secondary"
            variant="tonal"
            @click=${() =>
              window.open(
                `https://github.com/PAIR-code/deliberate-lab/issues/new`,
                '_blank',
              )}
          >
            🐞 Report a bug
          </pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-page': Settings;
  }
}
