import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';

import {styles} from './experimenter_data_editor.scss';

/** Editor for adjusting experimenter data */
@customElement('experimenter-data-editor')
export class ExperimenterDataEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  override render() {
    return html`
      ${this.renderGeminiKey()}
    `;
  }

  private renderGeminiKey() {
    const updateKey = (e: InputEvent) => {
      const data = this.authService.experimenterData;
      if (!data) return;

      const geminiKey = (e.target as HTMLTextAreaElement).value;
      const apiKeys = {...data.apiKeys, geminiKey};
      this.authService.writeExperimenterData({...data, apiKeys});
    };

    return html`
      <div class="section">
        <div class="title">API keys</div>
        <pr-textarea
          label="Gemini API key"
          placeholder="Add Gemini API key"
          variant="outlined"
          .value=${this.authService.experimenterData?.apiKeys.geminiKey ?? ''}
          @input=${updateKey}
        >
        </pr-textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-data-editor': ExperimenterDataEditor;
  }
}