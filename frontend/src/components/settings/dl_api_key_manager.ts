import '../../pair-components/button';
import '../../pair-components/icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import '@material/web/textfield/filled-text-field.js';

import {core} from '../../core/core';
import {FirebaseService} from '../../services/firebase.service';

import {
  createDeliberateLabAPIKeyCallable,
  listDeliberateLabAPIKeysCallable,
  revokeDeliberateLabAPIKeyCallable,
} from '../../shared/callables';

import {styles} from './dl_api_key_manager.scss';

interface DeliberateLabAPIKey {
  keyId: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  permissions: string[];
}

/** Deliberate Lab API Key Management component */
@customElement('dl-api-key-manager')
export class DeliberateLabAPIKeyManager extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly firebaseService = core.getService(FirebaseService);

  @state() apiKeys: DeliberateLabAPIKey[] = [];
  @state() isLoading = false;
  @state() newKeyName = '';
  @state() showCreateForm = false;
  @state() newlyCreatedKey: string | null = null;
  @state() error: string | null = null;
  @state() copied = false;

  override connectedCallback() {
    super.connectedCallback();
    this.loadAPIKeys();
  }

  private async loadAPIKeys() {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await listDeliberateLabAPIKeysCallable(
        this.firebaseService.functions,
      );
      this.apiKeys = result.keys;
    } catch (e) {
      console.error('Error loading API keys:', e);
      this.error = 'Failed to load API keys';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleCreateKey() {
    if (!this.newKeyName.trim()) {
      this.error = 'Please enter a name for the API key';
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await createDeliberateLabAPIKeyCallable(
        this.firebaseService.functions,
        this.newKeyName.trim(),
      );
      this.newlyCreatedKey = result.apiKey;
      this.newKeyName = '';
      this.showCreateForm = false;
      await this.loadAPIKeys();
    } catch (e) {
      console.error('Error creating API key:', e);
      this.error = 'Failed to create API key';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleRevokeKey(keyId: string, keyName: string) {
    if (
      !confirm(
        `Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      await revokeDeliberateLabAPIKeyCallable(
        this.firebaseService.functions,
        keyId,
      );
      await this.loadAPIKeys();
    } catch (e) {
      console.error('Error revoking API key:', e);
      this.error = 'Failed to revoke API key';
    } finally {
      this.isLoading = false;
    }
  }

  private handleCopyKey() {
    if (this.newlyCreatedKey) {
      navigator.clipboard.writeText(this.newlyCreatedKey);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    }
  }

  private handleDismissNewKey() {
    this.newlyCreatedKey = null;
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
      <div>
        ${this.error ? this.renderError() : nothing}
        ${this.newlyCreatedKey ? this.renderNewKeyAlert() : nothing}
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
        ?disabled=${this.isLoading}
        @click=${() => {
          this.showCreateForm = true;
        }}
      >
        + Create API Key
      </pr-button>
    `;
  }

  private renderError() {
    return html`
      <div class="banner error">
        <pr-icon icon="error"></pr-icon>
        ${this.error}
      </div>
    `;
  }

  private renderNewKeyAlert() {
    return html`
      <div class="banner success">
        <div class="banner-header">
          <pr-icon icon="check_circle"></pr-icon>
          <strong>API Key Created Successfully</strong>
        </div>
        <p>
          <strong
            >Save this API key now. You won't be able to see it again!</strong
          >
        </p>
        <div class="key-display">
          <code>${this.newlyCreatedKey}</code>
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
            ?disabled=${this.isLoading || !this.newKeyName.trim()}
            @click=${this.handleCreateKey}
          >
            Create Key
          </pr-button>
          <pr-button
            color="neutral"
            variant="outlined"
            ?disabled=${this.isLoading}
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
    if (this.isLoading && this.apiKeys.length === 0) {
      return html`<div class="empty-message">Loading API keys...</div>`;
    }

    if (this.apiKeys.length === 0) {
      return html`
        <div class="empty-message">
          No API keys yet. Create one to get started.
        </div>
      `;
    }

    return html`
      <div class="list">
        ${this.apiKeys.map((key) => this.renderKeyItem(key))}
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
          ?disabled=${this.isLoading}
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
