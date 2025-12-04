import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, css, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

@customElement('save-template-dialog')
export class SaveTemplateDialog extends MobxLitElement {
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
    .error-message {
      color: var(--md-sys-color-error);
      font-size: 12px;
      margin-top: 4px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-weight: 500;
      font-size: 14px;
    }

    select {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 4px;
      font-size: 14px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }
  `;

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @state() private name: string = '';
  @state() private description: string = '';
  @state() private saveMode: 'new' | 'update' = 'new';
  @state() private selectedTemplateId: string = '';
  @state() private visibility: 'public' | 'private' | 'shared' = 'private';
  @state() private sharedWith: string = '';

  override connectedCallback() {
    super.connectedCallback();
    this.experimentEditor.loadTemplates();
    this.name = this.experimentEditor.experiment.metadata.name;
    this.description = this.experimentEditor.experiment.metadata.description;

    this.saveMode = this.experimentEditor.saveTemplateMode;
    if (this.saveMode === 'update' && this.experimentEditor.loadedTemplateId) {
      this.selectedTemplateId = this.experimentEditor.loadedTemplateId;
      this.updateFieldsFromSelectedTemplate();
    } else {
      this.name = this.experimentEditor.experiment.metadata.name;
      this.description = this.experimentEditor.experiment.metadata.description;
      this.visibility = 'private';
      this.sharedWith = '';
    }
  }

  private get isDuplicateName(): boolean {
    return this.experimentEditor.savedTemplates.some(
      (t) =>
        t.experiment.metadata.name.toLowerCase() === this.name.toLowerCase() &&
        t.id !== this.selectedTemplateId,
    );
  }

  override render() {
    return html`
      <div class="dialog-overlay">
        <div class="dialog">
          <div class="header">
            <div class="title">Save as Template</div>
            <pr-icon-button
              icon="close"
              color="neutral"
              variant="default"
              @click=${this.close}
            ></pr-icon-button>
          </div>
          <div class="body">
            ${this.saveMode === 'update'
              ? html`
                  <div class="label">
                    Updating template:
                    <b>
                      ${this.experimentEditor.savedTemplates.find(
                        (t) => t.id === this.selectedTemplateId,
                      )?.experiment.metadata.name}
                    </b>
                  </div>
                `
              : nothing}

            <pr-textarea
              label="Template Name"
              variant="outlined"
              .value=${this.name}
              @input=${(e: InputEvent) => {
                this.name = (e.target as HTMLTextAreaElement).value;
              }}
            ></pr-textarea>
            ${this.isDuplicateName
              ? html`<div class="error-message">
                  A template with this name already exists.
                </div>`
              : nothing}
            <pr-textarea
              label="Template Description"
              variant="outlined"
              .value=${this.description}
              @input=${(e: InputEvent) => {
                this.description = (e.target as HTMLTextAreaElement).value;
              }}
            ></pr-textarea>

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
              ?disabled=${this.isDuplicateName || !this.name.trim()}
              @click=${this.save}
              >Save</pr-button
            >
          </div>
        </div>
      </div>
    `;
  }

  private close() {
    this.experimentEditor.setShowSaveTemplateDialog(false);
  }

  private async save() {
    const sharedWithList = this.sharedWith
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    await this.experimentEditor.saveTemplate(
      this.name,
      this.description,
      this.saveMode === 'update' ? this.selectedTemplateId : undefined,
      this.visibility,
      sharedWithList,
    );
    this.close();
    alert('Template saved successfully!');
  }

  private updateFieldsFromSelectedTemplate() {
    const template = this.experimentEditor.savedTemplates.find(
      (t) => t.id === this.selectedTemplateId,
    );
    if (template) {
      this.name = template.experiment.metadata.name;
      this.description = template.experiment.metadata.description;
      this.visibility = template.visibility ?? 'private';
      this.sharedWith = (template.sharedWith ?? []).join(', ');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'save-template-dialog': SaveTemplateDialog;
  }
}
