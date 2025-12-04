import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, css, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

@customElement('share-template-dialog')
export class ShareTemplateDialog extends MobxLitElement {
  static override styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.32);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .dialog {
      background: var(--md-sys-color-surface);
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      color: var(--md-sys-color-on-surface);
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      font-size: 18px;
      font-weight: 500;
    }

    .body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .footer {
      padding: 16px;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    pr-textarea {
      width: 100%;
    }

    select {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 4px;
      font-size: 14px;
      margin-top: 8px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }

    .description {
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant);
      margin-bottom: 8px;
    }
  `;

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @state() private visibility: 'public' | 'private' | 'shared' = 'private';
  @state() private sharedWith: string = '';

  override connectedCallback() {
    super.connectedCallback();
    const templateId = this.experimentEditor.loadedTemplateId;
    if (templateId) {
      const template = this.experimentEditor.savedTemplates.find(
        (t) => t.id === templateId,
      );
      if (template) {
        this.visibility = template.visibility ?? 'private';
        this.sharedWith = (template.sharedWith ?? []).join(', ');
      }
    }
  }

  override render() {
    return html`
      <div class="dialog-overlay">
        <div class="dialog">
          <div class="header">
            <div class="title">Share Template</div>
            <pr-icon-button
              icon="close"
              color="neutral"
              variant="default"
              @click=${this.close}
            ></pr-icon-button>
          </div>
          <div class="body">
            <div class="description">
              Control who can see and use this template.
            </div>

            <div class="form-group">
              <label>Visibility</label>
              <select
                .value=${this.visibility}
                @change=${(e: Event) => {
                  this.visibility = (e.target as HTMLSelectElement).value as
                    | 'public'
                    | 'private'
                    | 'shared';
                }}
              >
                <option value="private">Private (Only me)</option>
                <option value="shared">Shared (Specific people)</option>
                <option value="public">Public (Everyone)</option>
              </select>
            </div>

            ${this.visibility === 'shared'
              ? html`
                  <pr-textarea
                    label="Share with emails (comma separated)"
                    variant="outlined"
                    .value=${this.sharedWith}
                    @input=${(e: InputEvent) => {
                      this.sharedWith = (e.target as HTMLTextAreaElement).value;
                    }}
                  ></pr-textarea>
                `
              : nothing}
          </div>
          <div class="footer">
            <pr-button color="neutral" variant="outlined" @click=${this.close}
              >Cancel</pr-button
            >
            <pr-button
              color="primary"
              ?loading=${this.experimentEditor.isWritingExperiment}
              @click=${this.save}
              >Save</pr-button
            >
          </div>
        </div>
      </div>
    `;
  }

  private close() {
    this.experimentEditor.setShowShareTemplateDialog(false);
  }

  private async save() {
    const sharedWithList = this.sharedWith
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    await this.experimentEditor.updateTemplateVisibility(
      this.visibility,
      sharedWithList,
    );
    this.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'share-template-dialog': ShareTemplateDialog;
  }
}
