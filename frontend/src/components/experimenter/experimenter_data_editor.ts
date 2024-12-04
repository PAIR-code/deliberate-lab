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
      ${this.renderServerTypeButtons()}
      ${this.renderApiKeys()}
    `;
  }

  // ============ Server Type selection ============ 
  private renderServerTypeButtons() {
    return html`
    <div class="section">
      <h2>
        Select Server
      </h2>
      <div class="action-buttons">
        ${this.renderServerTypeButton('Llama Server', ApiKeyType.LLAMA_CUSTOM_URL)}
        ${this.renderServerTypeButton('Gemini', ApiKeyType.GEMINI_API_KEY)}
      </div>
    </div>`;
  }

  private renderServerTypeButton(serverTypeName: string, apiKeyType: ApiKeyType) {
    const isActive = this.authService.experimenterData?.activeApiKeyType === apiKeyType;

    return html`
      <pr-button
        color="${isActive ? 'primary' : 'neutral'}"
        variant=${isActive ? 'tonal' : 'default'}
        @click=${() => this.selectServerType(apiKeyType)}
      >
        ${serverTypeName}
      </pr-button>
    `;
  }

  private selectServerType(serverType: ApiKeyType) {
    const oldData = this.authService.experimenterData;
    if (!oldData) return;

    let newData: ExperimenterData = {
      ...oldData,
      activeApiKeyType: serverType,
    };

    this.authService.writeExperimenterData(newData);
    this.requestUpdate(); // change visibility of relevant api key sections 
  }


  private renderApiKeys() {
    // hide or show relevant input sections, according to which server type
    // the user has selected
    const activeType = this.authService.experimenterData?.activeApiKeyType;
  
    switch(activeType) {
      case ApiKeyType.GEMINI_API_KEY:
        return this.renderGeminiKey();
      case ApiKeyType.LLAMA_CUSTOM_URL:
        return this.renderServerSettings();
      default:
        console.log("Error: invalid server setting selected :", activeType);
        return this.renderGeminiKey();
    }    
  }

  // ============ Gemini ============ 
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

    
    return html`
      <div class="section">
        <div class="title">Gemini</div>
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

  // ============ Llama server ============ 
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
          //may be useful later, switch will be reused for any other config this needs in the future
        /*
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
          */
        default:
          console.log("No field associated with llama server settings: ", field);
          return;
      };
      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <div class="title">LLaMa Server</div>
        <pr-textarea
          label="Server URL"
          placeholder="Enter server URL"
          variant="outlined"
          .value=${data?.llamaApiKey?.url ?? ""} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'serverUrl')}
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