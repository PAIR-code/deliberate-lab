import '../../pair-components/textarea';

import { MobxLitElement } from '@adobe/lit-mobx';
import { CSSResultGroup, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { core } from '../../core/core';
import { AuthService } from '../../services/auth.service';

import { styles } from './experimenter_data_editor.scss';
import { ApiKeyType, ExperimenterData } from '@deliberation-lab/utils';

/** Editor for adjusting experimenter data */
@customElement('experimenter-data-editor')
export class ExperimenterDataEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  override render() {
    return html`
      ${this.renderGeminiKey()}
      ${this.renderServerSettings()}
    `;
  }

  private renderGeminiKey() {
    const updateKey = (e: InputEvent) => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const geminiKey = (e.target as HTMLTextAreaElement).value;
      const new_data = {
        id: oldData.id,
        geminiApiKey: geminiKey,
        llamaApiKey: oldData.llamaApiKey,
        activeApiKeyType: ApiKeyType.GEMINI_API_KEY
      };
      this.authService.writeExperimenterData(new_data);
    };

    // TODO: Make this more clear when this has been saved.
    return html`
      <div class="section">
        <div class="title">API keys</div>
        <pr-textarea
          label="Gemini API key"
          placeholder="Add Gemini API key"
          variant="outlined"
          .value=${this.authService.experimenterData?.geminiApiKey ?? ''}
          @input=${updateKey}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderServerSettings() {
    const updateServerSettings = (e: InputEvent, field: 'serverUrl' | 'port') => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const serverSettings = (e.target as HTMLInputElement).value;

      // This function will override the API key type. Thus, if someone selects
      // this field, the website will think he wants a Llama key
      // maybe a dropdown menu would be useful here
      // TODO: fix
      let newData: ExperimenterData;
      switch (field) {
        case "serverUrl":
          newData = {
            id: oldData.id,
            activeApiKeyType: ApiKeyType.LLAMA_CUSTOM_URL,
            llamaApiKey: {
              url: serverSettings,
              port: oldData.llamaApiKey.port
            },
            geminiApiKey: oldData.geminiApiKey
          }
          break;

        case "port":
          newData = {
            id: oldData.id,
            activeApiKeyType: ApiKeyType.LLAMA_CUSTOM_URL,
            llamaApiKey: {
              url: oldData.llamaApiKey.url,
              //TODO: Validate or use int field
              port: parseInt(serverSettings)
            },
            geminiApiKey: oldData.geminiApiKey
          }
          break;

        default:
          console.log("No field associated with llama server settings: ", field);
          return;
      };
      this.authService.writeExperimenterData(newData);
    };

const data = this.authService.experimenterData;
return html`
      <div class="section">
        <div class="title">Server Settings</div>
        <pr-textarea
          label="Server URL"
          placeholder="Enter server URL"
          variant="outlined"
          .value=${data?.llamaApiKey?.url ?? "aaaaaaa"} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'serverUrl')}
        >
        </pr-textarea>
        <pr-textarea
          label="Port"
          placeholder="Enter port number"
          variant="outlined"
          .value=${data?.llamaApiKey?.port ?? ""}
          @input=${(e: InputEvent) => updateServerSettings(e, 'port')}
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