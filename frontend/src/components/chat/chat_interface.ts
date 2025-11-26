import '../chat/chat_info_panel';
import '../chat/chat_input';
import '../chat/chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {StageConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './chat_interface.scss';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Object}) stage: StageConfig | undefined = undefined;
  @property({type: Boolean}) showPanel = false;
  @property({type: Boolean}) showInput = true;
  @property({type: Boolean}) disableInput = false;

  // Tracks inner width of window
  @state() mobileView = false;

  private updateResponsiveState = () => {
    this.mobileView = window.innerWidth <= 1024;
  };

  connectedCallback() {
    super.connectedCallback();
    this.updateResponsiveState();
    window.addEventListener('resize', this.updateResponsiveState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.updateResponsiveState);
  }

  private renderPanel() {
    if (!this.stage) return nothing;
    return html`
      <chat-info-panel .stage=${this.stage} .topLayout=${this.mobileView}>
      </chat-info-panel>
    `;
  }

  override render() {
    if (!this.stage) return nothing;
    return html`
      <div class="interface-wrapper ${this.mobileView ? 'vertical' : ''}">
        ${this.showPanel ? this.renderPanel() : nothing}
        <div class="main-content">
          <div class="chat-content">
            <div class="chat-scroll">
              <div class="chat-history">
                ${
                  this.mobileView
                    ? html`<slot name="mobile-description"></slot>`
                    : nothing
                }
                <slot></slot>
              </div>
            </div>
          </div>
          <slot name="indicators"></slot>
          ${
            !this.showInput
              ? nothing
              : html`<chat-input
                  .stageId=${this.stage?.id ?? ''}
                  .isDisabled=${this.disableInput}
                ></chat-input>`
          }
          </chat-input>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
