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
      <div class="title">
        LLM Host Selection
      </div>
      <div class="action-buttons">
        ${this.renderServerTypeButton('Gemini', ApiKeyType.GEMINI_API_KEY)}
        ${this.renderServerTypeButton('Ollama Server', ApiKeyType.OLLAMA_CUSTOM_URL)}
      </div>
    </div>`;
  }

  private renderServerTypeButton(serverTypeName: string, apiKeyType: ApiKeyType) {
    const isActive = this.authService.experimenterData?.apiConfig.activeApiKeyType === apiKeyType;

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

    const newData = updateExperimenterData(oldData, {
      apiConfig: { ...oldData.apiConfig, activeApiKeyType: serverType },
    });

    this.authService.writeExperimenterData(newData);
    this.requestUpdate(); // Change visibility of relevant API key sections
  }

  private renderApiKeys() {
    const activeType = this.authService.experimenterData?.apiConfig.activeApiKeyType;

    switch (activeType) {
      case ApiKeyType.GEMINI_API_KEY:
        return this.renderGeminiKey();
      case ApiKeyType.OLLAMA_CUSTOM_URL:
        return this.renderServerSettings();
      default:
        console.error("Error: invalid server setting selected :", activeType);
        return this.renderGeminiKey();
    }
  }

  // ============ Gemini ============ 
  private renderGeminiKey() {
    const updateKey = (e: InputEvent) => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const geminiKey = (e.target as HTMLTextAreaElement).value;
      const newData = updateExperimenterData(oldData, {
        apiConfig: { ...oldData.apiConfig, geminiApiKey: geminiKey },
      });

      this.authService.writeExperimenterData(newData);
    };

    return html`
      <div class="section">
        <pr-textarea
          label="Gemini API key"
          placeholder="Add Gemini API key"
          variant="outlined"
          .value=${this.authService.experimenterData?.apiConfig.geminiApiKey ?? ''}
          @input=${updateKey}
        ></pr-textarea>
      </div>
    `;
  }

  // ============ Local Ollama server ============ 
  private renderServerSettings() {
    const updateServerSettings = (e: InputEvent, field: 'url' | 'llmType') => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const llmType = (e.target as HTMLInputElement).value;

      const newData = updateExperimenterData(oldData, {
        apiConfig: {
          ...oldData.apiConfig,
          ollamaApiKey: {
            ...oldData.apiConfig.ollamaApiKey,
            llmType: llmType, // Update only the `llmType`
          },
        },
      });


      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <pr-textarea
          label="Server URL"
          placeholder="http://example:80/api/chat"
          variant="outlined"
          .value=${data?.apiConfig.ollamaApiKey?.url ?? ""} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'url')}
        ></pr-textarea>
        <p>Please ensure that the URL is valid before proceeding.</p>

        <pr-textarea
          label="LLM type"
          placeholder="llama3.2"
          variant="outlined"
          .value=${data?.apiConfig.ollamaApiKey?.llmType ?? ""} 
          @input=${(e: InputEvent) => updateServerSettings(e, 'llmType')}
        ></pr-textarea>
        <p>
          All supported LLM types can be found 
          <a target="_blank" href="https://ollama.com/library">here</a>.
          Make sure the LLM type has been deployed on the server prior to selecting it here.
        </p>
      </div>
    `;
  }
}


// Utility function to create updated ExperimenterData
function updateExperimenterData(
  oldData: ExperimenterData,
  updatedFields: Partial<ExperimenterData>
): ExperimenterData {
  return {
    ...oldData,
    ...updatedFields,
    apiConfig: {
      ...oldData.apiConfig,
      ...updatedFields.apiConfig,
      ollamaApiKey: {
        ...oldData.apiConfig.ollamaApiKey,
        ...(updatedFields.apiConfig?.ollamaApiKey || {}),
      },
    },
  };
}