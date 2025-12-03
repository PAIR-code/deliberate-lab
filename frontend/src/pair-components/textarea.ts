import {CSSResultGroup, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {createRef, Ref, ref} from 'lit/directives/ref.js';

import {styles as sharedStyles} from './shared.css';
import type {ComponentColor, ComponentSize, ComponentVariant} from './types';
import {getComponentClassName} from './utils';

import {styles} from './textarea.css';

function fitTextAreaToContent(
  textarea: HTMLElement,
  maxViewportHeight: number | undefined,
  rows: number | undefined,
) {
  // If rows is set, use 'auto' to respect it as minimum height
  // Otherwise use '0px' to fit exactly to content
  textarea.style.height = rows !== undefined ? 'auto' : '0px';
  const height = textarea.scrollHeight;

  // Apply max viewport height constraint if specified
  // NOTE: The .01 factor converts maxViewportHeight (e.g., 80vh) to
  //       a percentage (e.g., .80) of the window's inner height
  textarea.style.height = maxViewportHeight
    ? `${Math.min(height, window.innerHeight * 0.01 * maxViewportHeight)}px`
    : `${height}px`;
}

/**
 * Textarea
 */
@customElement('pr-textarea')
export class TextArea extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({type: String}) label = '';
  @property({type: String}) placeholder = '';
  @property({type: String}) value = '';
  @property({type: Boolean}) disabled = false;
  @property({type: Boolean}) focused = false;
  @property({type: Number}) rows: number | undefined = undefined;

  // Max height for the textarea in vh (e.g., 80 for 80vh max height)
  @property() maxViewportHeight: number | undefined = undefined;

  // Custom styles
  @property({type: String}) color: ComponentColor = 'primary';
  @property({type: String}) size: ComponentSize = 'small';
  @property({type: String}) variant: ComponentVariant = 'default';

  textareaRef: Ref<Element> = createRef();
  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const textarea = entry.target as HTMLElement;
      fitTextAreaToContent(textarea, this.maxViewportHeight, this.rows);
    });
  });

  override firstUpdated() {
    if (this.textareaRef?.value) {
      this.resizeObserver.observe(this.textareaRef.value);
    }
    if (this.focused) {
      (this.renderRoot.querySelector('#textarea') as HTMLElement).focus();
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (this.textareaRef?.value) {
      fitTextAreaToContent(
        this.textareaRef.value as HTMLElement,
        this.maxViewportHeight,
        this.rows,
      );
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.textareaRef?.value) {
      this.resizeObserver.unobserve(this.textareaRef.value);
    }
  }

  renderLabel() {
    const className = getComponentClassName('label-size', this.size);

    return this.label.length > 0
      ? html`<label for=${this.id} class=${className}>${this.label}</label>`
      : html``;
  }

  onChange(e: InputEvent) {
    const inputElement = e.target as HTMLInputElement;

    if (inputElement) {
      this.value = inputElement.value;

      const event = {detail: {value: inputElement.value}};
      this.dispatchEvent(new CustomEvent('change', event));
    }
  }

  override render() {
    const classes = classMap({
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
      'variant-default': this.variant === 'default',
      'variant-outlined': this.variant === 'outlined',
    });

    return html`
      ${this.renderLabel()}
      <div class="textarea-wrapper">
        <textarea
          id="textarea"
          ${ref(this.textareaRef)}
          class=${classes}
          ?disabled=${this.disabled}
          type="text"
          placeholder=${this.placeholder}
          .rows=${this.rows}
          .value=${this.value}
          @input=${this.onChange}
        ></textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-textarea': TextArea;
  }
}
