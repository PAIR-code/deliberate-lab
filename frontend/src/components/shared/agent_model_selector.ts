import '../../pair-components/button';
import '@material/web/textfield/filled-text-field.js';

import {LitElement, CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  ApiKeyType,
  ExperimenterData,
  checkApiKeyExists,
  getDefaultModelForApiType,
} from '@deliberation-lab/utils';

import {styles} from './agent_model_selector.scss';

/** Shared component for selecting an LLM API type and model. */
@customElement('agent-model-selector')
export class AgentModelSelector extends LitElement {
  static override styles: CSSResultGroup = [styles];

  @property() apiType: ApiKeyType = ApiKeyType.GEMINI_API_KEY;
  @property() modelName: string = '';
  @property({type: Boolean}) disabled = false;
  @property({type: Object}) experimenterData:
    | ExperimenterData
    | null
    | undefined = undefined;

  private emitChange(apiType: ApiKeyType, modelName: string) {
    this.dispatchEvent(
      new CustomEvent('model-settings-change', {
        detail: {apiType, modelName},
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html` ${this.renderApiType()} ${this.renderModel()} `;
  }

  private renderApiType() {
    return html`
      <div>
        <div class="field-title">LLM API</div>
        <div class="api-type-buttons">
          ${this.renderApiTypeButton('Gemini', ApiKeyType.GEMINI_API_KEY)}
          ${this.renderApiTypeButton('Vertex AI', ApiKeyType.VERTEX_AI_API_KEY)}
          ${this.renderApiTypeButton(
            'OpenAI or compatible API',
            ApiKeyType.OPENAI_API_KEY,
          )}
          ${this.renderApiTypeButton(
            'Claude or compatible API',
            ApiKeyType.CLAUDE_API_KEY,
          )}
          ${this.renderApiTypeButton(
            'Ollama Server',
            ApiKeyType.OLLAMA_CUSTOM_URL,
          )}
        </div>
      </div>
    `;
  }

  private renderApiTypeButton(label: string, apiType: ApiKeyType) {
    const isActive = apiType === this.apiType;
    // Only perform the key check when experimenterData is explicitly provided.
    const hasKey =
      this.experimenterData === undefined ||
      checkApiKeyExists(apiType, this.experimenterData);
    const isDisabled = this.disabled || !hasKey;
    const tooltipText = !hasKey
      ? apiType === ApiKeyType.OLLAMA_CUSTOM_URL
        ? "You haven't added a compatible server URL"
        : "You haven't added a compatible API key"
      : '';
    return html`
      <pr-button
        color="${isActive ? 'primary' : 'neutral'}"
        variant=${isActive ? 'tonal' : 'default'}
        ?disabled=${isDisabled}
        title=${tooltipText}
        style=${!hasKey ? 'opacity: 0.45;' : ''}
        @click=${() => {
          if (!hasKey) return;
          this.emitChange(apiType, getDefaultModelForApiType(apiType));
        }}
      >
        ${!hasKey ? html`⚠️ ` : ''}${label}
      </pr-button>
    `;
  }

  private renderModel() {
    return html`
      <md-filled-text-field
        label="Model ID"
        .value=${this.modelName}
        ?disabled=${this.disabled}
        @input=${(e: InputEvent) => {
          const modelName = (e.target as HTMLInputElement).value;
          this.emitChange(this.apiType, modelName);
        }}
      >
      </md-filled-text-field>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-model-selector': AgentModelSelector;
  }
}
