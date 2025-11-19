import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import '@material/web/textfield/filled-text-field.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {styles} from './experimenter_data_editor.scss';
import {
  ApiKeyType,
  BaseAgentPromptConfig,
  ExperimenterData,
  StageKind,
  createAgentModelSettings,
  createAgentMediatorPersonaConfig,
  createAgentPromptSettings,
  createModelGenerationConfig,
  checkApiKeyExists,
  createClaudeServerConfig,
  createOpenAIServerConfig,
  createStructuredOutputConfig,
} from '@deliberation-lab/utils';

/** Editor for adjusting experimenter data */
@customElement('experimenter-data-editor')
export class ExperimenterDataEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);

  @state() geminiKeyResponse: null | boolean = null;
  @state() openAIKeyResponse: null | boolean = null;
  @state() claudeKeyResponse: null | boolean = null;
  @state() ollamaKeyResponse: null | boolean = null;

  override render() {
    const experiment = this.experimentService.experiment;
    if (
      experiment &&
      experiment.metadata.creator !== this.authService.userEmail
    ) {
      return html`
        <div>
          This experiment uses API keys provided by the creator of the
          experiment: ${experiment.metadata.creator}
        </div>
      `;
    }

    return html`
      <div class="banner">
        Note: API keys are shared across all of your experiments!
      </div>
      ${this.renderGeminiKey()}
      <div class="divider"></div>
      ${this.renderOpenAISettings()}
      <div class="divider"></div>
      ${this.renderClaudeSettings()}
      <div class="divider"></div>
      ${this.renderOllamaSettings()}
    `;
  }

  private renderCheckApiKey(apiType: ApiKeyType) {
    const agentConfig = createAgentMediatorPersonaConfig({
      defaultModelSettings: createAgentModelSettings({apiType}),
    });
    const promptConfig: BaseAgentPromptConfig = {
      id: '',
      type: StageKind.INFO,
      promptContext: 'Say "hello world" and tell a unique joke',
      generationConfig: createModelGenerationConfig(),
      promptSettings: createAgentPromptSettings(),
      structuredOutputConfig: createStructuredOutputConfig(),
    };

    const testEndpoint = async () => {
      const result =
        (
          await this.experimentManager.testAgentConfig(
            agentConfig,
            promptConfig,
          )
        )?.length > 0;
      if (apiType === ApiKeyType.GEMINI_API_KEY) {
        this.geminiKeyResponse = result;
      } else if (apiType === ApiKeyType.OPENAI_API_KEY) {
        this.openAIKeyResponse = result;
      } else if (apiType === ApiKeyType.CLAUDE_API_KEY) {
        this.claudeKeyResponse = result;
      } else if (apiType === ApiKeyType.OLLAMA_CUSTOM_URL) {
        this.ollamaKeyResponse = result;
      }
    };

    const getResult = () => {
      if (apiType === ApiKeyType.GEMINI_API_KEY) {
        return this.geminiKeyResponse;
      } else if (apiType === ApiKeyType.OPENAI_API_KEY) {
        return this.openAIKeyResponse;
      } else if (apiType === ApiKeyType.CLAUDE_API_KEY) {
        return this.claudeKeyResponse;
      } else if (apiType === ApiKeyType.OLLAMA_CUSTOM_URL) {
        return this.ollamaKeyResponse;
      }
    };

    const result = getResult();
    return html`
      <div class="api-check">
        <pr-tooltip text="Test API key">
          <pr-icon-button
            icon="key"
            color="neutral"
            variant="default"
            @click=${testEndpoint}
          >
          </pr-icon-button>
        </pr-tooltip>
        ${result === null
          ? ''
          : result
            ? html`<div class="banner success">Valid API key</div>`
            : html`<div class="banner error">Invalid API key</div>`}
      </div>
    `;
  }

  // ============ Gemini ============
  private renderGeminiKey() {
    const updateKey = (e: InputEvent) => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const geminiKey = (e.target as HTMLTextAreaElement).value;
      this.geminiKeyResponse = null;
      const newData = updateExperimenterData(oldData, {
        apiKeys: {...oldData.apiKeys, geminiApiKey: geminiKey},
      });

      this.authService.writeExperimenterData(newData);
    };

    return html`
      <div class="section">
        <h3>Gemini API settings</h3>
        <md-filled-text-field
          label="Gemini API key"
          placeholder="Add Gemini API key"
          .value=${this.authService.experimenterData?.apiKeys.geminiApiKey ??
          ''}
          @input=${updateKey}
        ></md-filled-text-field>
        ${this.renderCheckApiKey(ApiKeyType.GEMINI_API_KEY)}
      </div>
    `;
  }

  // ============ Claude ============

  private renderClaudeSettings() {
    const updateClaudeSettings = (
      e: InputEvent,
      field: 'apiKey' | 'baseUrl',
    ) => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const value = (e.target as HTMLInputElement).value;
      this.claudeKeyResponse = null;

      const newData = updateExperimenterData(oldData, {
        apiKeys: {
          ...oldData.apiKeys,
          claudeApiKey: {
            ...(oldData.apiKeys?.claudeApiKey ?? createClaudeServerConfig()),
            [field]: value,
          },
        },
      });

      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <h3>Claude API settings</h3>
        <md-filled-text-field
          label="Claude API key"
          placeholder="Add Claude API key"
          .value=${data?.apiKeys.claudeApiKey?.apiKey ?? ''}
          @input=${(e: InputEvent) => updateClaudeSettings(e, 'apiKey')}
        ></md-filled-text-field>

        <md-filled-text-field
          label="Base URL (optional)"
          placeholder="https://api.anthropic.com"
          .value=${data?.apiKeys.claudeApiKey?.baseUrl ?? ''}
          @input=${(e: InputEvent) => updateClaudeSettings(e, 'baseUrl')}
        ></md-filled-text-field>

        ${this.renderCheckApiKey(ApiKeyType.CLAUDE_API_KEY)}
      </div>
    `;
  }
  // ============ OpenAI-compatible API ============
  private renderOpenAISettings() {
    const updateOpenAISettings = (
      e: InputEvent,
      field: 'apiKey' | 'baseUrl',
    ) => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const value = (e.target as HTMLInputElement).value;
      this.openAIKeyResponse = null;
      let newData;

      switch (field) {
        case 'apiKey':
          newData = updateExperimenterData(oldData, {
            apiKeys: {
              ...oldData.apiKeys,
              openAIApiKey: {
                ...(oldData.apiKeys?.openAIApiKey ??
                  createOpenAIServerConfig()),
                apiKey: value,
              },
            },
          });
          break;

        case 'baseUrl':
          newData = updateExperimenterData(oldData, {
            apiKeys: {
              ...oldData.apiKeys,
              openAIApiKey: {
                ...(oldData.apiKeys?.openAIApiKey ??
                  createOpenAIServerConfig()),
                baseUrl: value,
              },
            },
          });
          break;
        default:
          console.error('Error: field type not found: ', field);
          return;
      }

      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <h3>Open AI API settings</h3>
        <md-filled-text-field
          label="API key"
          placeholder="Add Open AI API key"
          .value=${data?.apiKeys.openAIApiKey?.apiKey ?? ''}
          @input=${(e: InputEvent) => updateOpenAISettings(e, 'apiKey')}
        ></md-filled-text-field>

        <md-filled-text-field
          label="Base URL (if blank, uses OpenAI's servers)"
          placeholder="http://example:14434/v1"
          variant="outlined"
          .value=${data?.apiKeys.openAIApiKey?.baseUrl ?? ''}
          @input=${(e: InputEvent) => updateOpenAISettings(e, 'baseUrl')}
        ></md-filled-text-field>
        ${this.renderCheckApiKey(ApiKeyType.OPENAI_API_KEY)}
      </div>
    `;
  }

  // ============ Local Ollama server ============
  private renderOllamaSettings() {
    const updateServerSettings = (e: InputEvent, field: 'url') => {
      const oldData = this.authService.experimenterData;
      if (!oldData) return;

      const value = (e.target as HTMLInputElement).value;
      this.ollamaKeyResponse = null;
      let newData;

      switch (field) {
        case 'url':
          newData = updateExperimenterData(oldData, {
            apiKeys: {
              ...oldData.apiKeys,
              ollamaApiKey: {
                ...oldData.apiKeys.ollamaApiKey,
                url: value,
              },
            },
          });
          break;
        default:
          console.error('Error: field type not found: ', field);
          return;
      }

      this.authService.writeExperimenterData(newData);
    };

    const data = this.authService.experimenterData;
    return html`
      <div class="section">
        <h3>Ollama API settings</h3>
        <md-filled-text-field
          label="Server URL (please ensure URL is valid!)"
          placeholder="http://example:80/api/chat"
          .value=${data?.apiKeys.ollamaApiKey?.url ?? ''}
          @input=${(e: InputEvent) => updateServerSettings(e, 'url')}
        ></md-filled-text-field>
        ${this.renderCheckApiKey(ApiKeyType.OLLAMA_CUSTOM_URL)}
      </div>
    `;
  }
}

// Utility function to create updated ExperimenterData
function updateExperimenterData(
  oldData: ExperimenterData,
  updatedFields: Partial<ExperimenterData>,
): ExperimenterData {
  return {
    ...oldData,
    ...updatedFields,
    apiKeys: {
      ...oldData.apiKeys,
      ...updatedFields.apiKeys,
      ollamaApiKey: {
        ...oldData.apiKeys.ollamaApiKey,
        ...(updatedFields.apiKeys?.ollamaApiKey || {}),
      },
    },
  };
}
