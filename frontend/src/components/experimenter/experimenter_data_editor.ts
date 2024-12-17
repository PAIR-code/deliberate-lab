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
        Select LLM host
      </h2>
      <div class="action-buttons">
        ${this.renderServerTypeButton('Gemini', ApiKeyType.GEMINI_API_KEY)}
        ${this.renderServerTypeButton('Ollama Server', ApiKeyType.LLAMA_CUSTOM_URL)}
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
    const updateServerSettings = (e: InputEvent, field: 'serverUrl' | 'llmType') => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const serverSettings = (e.target as HTMLInputElement).value;

      let newData: ExperimenterData;
      switch (field) {
        case "serverUrl":
          newData = {
            id: oldData.id,
            activeApiKeyType: ApiKeyType.LLAMA_CUSTOM_URL,
            llamaApiKey: {
              url: serverSettings,
              llmType: oldData.llamaApiKey.llmType
            },
            geminiApiKey: oldData.geminiApiKey
          }
          break;
        case "llmType":
          newData = {
            id: oldData.id,
            activeApiKeyType: ApiKeyType.LLAMA_CUSTOM_URL,
            llamaApiKey: {
              url: oldData.llamaApiKey.url,
              llmType: serverSettings
            },
            geminiApiKey: oldData.geminiApiKey
          }
          break;
        // more configs may be added in the future (e.g. server auth)

        default:
          console.log("No field associated with llama server settings: ", field);
          return;
      };
      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <div class="title">Ollama Server</div>
        <pr-textarea
          label="Server URL"
          placeholder="http://example:80/api/chat"
          variant="outlined"
          .value=${data?.llamaApiKey?.url ?? ""} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'serverUrl')}
        >
        </pr-textarea>
        <p>
          Please ensure that the URL is valid before proceeding.
        </p>

        <pr-textarea
          label="LLM type"
          placeholder="llama3.2"
          variant="outlined"
          .value=${data?.llamaApiKey?.llmType ?? ""} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'llmType')}
        >
        </pr-textarea>
        <p>
          All supported LLM types can be found <a target="_blank" href=https://ollama.com/library>here</a>. 
          Make sure the LLM type has been deployed on the server prior to selecting it here.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-data-editor': ExperimenterDataEditor;
  }
}