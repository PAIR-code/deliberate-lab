import '../../pair-components/button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import '@material/web/textfield/filled-text-field.js';

import {core} from '../../core/core';
import {SettingsService} from '../../services/settings.service';
import {DeliberateLabAPIKey} from '@deliberation-lab/utils';

import {styles} from './dl_api_key_manager.scss';

/** Deliberate Lab API Key Management component */
@customElement('dl-api-key-manager')
export class DeliberateLabAPIKeyManager extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly settingsService = core.getService(SettingsService);

  @state() newKeyName = '';
  @state() showCreateForm = false;
  @state() copied = false;

  override connectedCallback() {
    super.connectedCallback();
    this.settingsService.subscribeToDeliberateLabAPIKeys();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.settingsService.unsubscribeFromDeliberateLabAPIKeys();
  }

  private async handleCreateKey() {
    const success = await this.settingsService.createDeliberateLabAPIKey(
      this.newKeyName,
    );
    if (success) {
      this.newKeyName = '';
      this.showCreateForm = false;
    }
  }

  private async handleRevokeKey(keyId: string, keyName: string) {
    if (
      !confirm(
        `Are you sure you want to revoke the Deliberate Lab API key "${keyName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    await this.settingsService.revokeDeliberateLabAPIKey(keyId);
  }

  private handleCopyKey() {
    if (this.settingsService.newlyCreatedDeliberateLabAPIKey) {
      navigator.clipboard.writeText(
        this.settingsService.newlyCreatedDeliberateLabAPIKey,
      );
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    }
  }

  private handleDismissNewKey() {
    this.settingsService.dismissNewDeliberateLabAPIKey();
    this.copied = false;
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  private formatPermissions(permissions: string[]): string {
    return permissions.join(', ');
  }

  override render() {
    return html`
      <div class="api-key-manager">
        ${this.settingsService.deliberateLabAPIKeyError
          ? this.renderError()
          : nothing}
        ${this.settingsService.newlyCreatedDeliberateLabAPIKey
          ? this.renderNewKeyAlert()
          : nothing}
        ${this.showCreateForm ? this.renderCreateForm() : nothing}
        ${!this.showCreateForm ? this.renderCreateButton() : nothing}
        ${this.renderKeyList()}
      </div>
    `;
  }

  private renderCreateButton() {
    return html`
      <pr-button
        color="primary"
        variant="tonal"
        ?disabled=${this.settingsService.isLoadingDeliberateLabAPIKeys}
        @click=${() => {
          this.showCreateForm = true;
        }}
      >
        + Create Deliberate Lab API Key
      </pr-button>
    `;
  }

  private renderError() {
    return html`
      <div class="banner error">
        ⚠️ ${this.settingsService.deliberateLabAPIKeyError}
      </div>
    `;
  }

  private renderNewKeyAlert() {
    return html`
      <div class="banner success">
        <div class="banner-header">
          <strong>✅ Deliberate Lab API Key Created Successfully</strong>
        </div>
        <p>
          <strong
            >Save this API key now. You won't be able to see it again!</strong
          >
        </p>
        <div class="key-display">
          <code>${this.settingsService.newlyCreatedDeliberateLabAPIKey}</code>
          <pr-button
            color=${this.copied ? 'tertiary' : 'primary'}
            variant=${this.copied ? 'tonal' : 'default'}
            @click=${this.handleCopyKey}
          >
            ${this.copied ? 'Copied!' : 'Copy'}
          </pr-button>
        </div>
        <pr-button
          color="neutral"
          variant="outlined"
          @click=${this.handleDismissNewKey}
        >
          I've saved the key
        </pr-button>
      </div>
    `;
  }

  private renderCreateForm() {
    return html`
      <div class="section">
        <md-filled-text-field
          label="Key Name"
          placeholder="e.g., Production API Key"
          .value=${this.newKeyName}
          @input=${(e: InputEvent) => {
            this.newKeyName = (e.target as HTMLInputElement).value;
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              this.handleCreateKey();
            }
          }}
        ></md-filled-text-field>
        <div class="action-buttons">
          <pr-button
            color="primary"
            variant="tonal"
            ?disabled=${this.settingsService.isLoadingDeliberateLabAPIKeys ||
            !this.newKeyName.trim()}
            @click=${this.handleCreateKey}
          >
            Create Key
          </pr-button>
          <pr-button
            color="neutral"
            variant="outlined"
            ?disabled=${this.settingsService.isLoadingDeliberateLabAPIKeys}
            @click=${() => {
              this.showCreateForm = false;
              this.newKeyName = '';
            }}
          >
            Cancel
          </pr-button>
        </div>
      </div>
      <div class="divider"></div>
    `;
  }

  private renderKeyList() {
    if (
      this.settingsService.isLoadingDeliberateLabAPIKeys &&
      this.settingsService.deliberateLabAPIKeys.length === 0
    ) {
      return html`<div class="empty-message">Loading API keys...</div>`;
    }

    if (this.settingsService.deliberateLabAPIKeys.length === 0) {
      return html`
        <div class="empty-message">
          No Deliberate Lab API keys yet. Create one to get started with
          programmatic access to your experiments.
        </div>
      `;
    }

    return html`
      <div class="list">
        ${this.settingsService.deliberateLabAPIKeys.map((key) =>
          this.renderKeyItem(key),
        )}
      </div>
    `;
  }

  private renderKeyItem(key: DeliberateLabAPIKey) {
    return html`
      <div class="key-item">
        <div class="key-info">
          <div class="title">${key.name}</div>
          <div class="subtitle">
            <div><b>Key ID:</b> ${key.keyId}</div>
            <div><b>Created:</b> ${this.formatDate(key.createdAt)}</div>
            <div>
              <b>Last Used:</b>
              ${key.lastUsed ? this.formatDate(key.lastUsed) : 'Never'}
            </div>
            <div>
              <b>Permissions:</b> ${this.formatPermissions(key.permissions)}
            </div>
          </div>
        </div>
        <pr-button
          color="error"
          variant="outlined"
          ?disabled=${this.settingsService.isLoadingDeliberateLabAPIKeys}
          @click=${() => this.handleRevokeKey(key.keyId, key.name)}
        >
          Revoke
        </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dl-api-key-manager': DeliberateLabAPIKeyManager;
  }
}
