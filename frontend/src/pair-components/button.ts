import {CSSResultGroup, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {styles as sharedStyles} from './shared.css';
import type {ComponentColor, ComponentSize, ComponentVariant} from './types';

import {styles} from './button.css';

type ButtonShape = 'default' | 'round';

/**
 * Text button.
 *
 * - Use "disabled" state when button should not be clickable
 *   (e.g., if it's a Save button and there are no unsaved changed)
 *
 * - Use "loading" state when button should not be clickable AND you want a
 *   loading spinner in place of the text
 *   (e.g., if it's a Save button and the content is currently saving)
 */
@customElement('pr-button')
export class Button extends LitElement {
  static override styles: CSSResultGroup = [sharedStyles, styles];

  // Component settings
  @property({type: Boolean}) disabled = false;
  @property({type: Boolean}) loading = false;

  // Custom styles
  @property({type: String}) color: ComponentColor = 'primary';
  @property({type: String}) padding: ComponentSize = 'small';
  @property({type: String}) shape: ButtonShape = 'default';
  @property({type: String}) size: ComponentSize = 'small';
  @property({type: String}) variant: ComponentVariant = 'filled';

  override render() {
    const classes = classMap({
      'body-size-small': this.size === 'small',
      'body-size-medium': this.size === 'medium',
      'body-size-large': this.size === 'large',
      'padding-small': this.padding === 'small',
      'padding-medium': this.padding === 'medium',
      'padding-large': this.padding === 'large',
      'palette-primary': this.color === 'primary',
      'palette-secondary': this.color === 'secondary',
      'palette-tertiary': this.color === 'tertiary',
      'palette-neutral': this.color === 'neutral',
      'palette-error': this.color === 'error',
      'shape-round': this.shape === 'round',
      'variant-default': this.variant === 'default',
      'variant-filled': this.variant === 'filled',
      'variant-outlined': this.variant === 'outlined',
      'variant-tonal': this.variant === 'tonal',
    });

    const renderButtonContent = () => {
      return html`
        <div class="button-wrapper">
          <slot class="button-slot ${this.loading ? 'hidden' : ''}"></slot>
          <div class="loading-spinner-wrapper ${this.loading ? '' : 'hidden'}">
            <span class="loading-spinner"></span>
          </div>
        </div>
      `;
    };

    return html`
      <button
        type="button"
        ?disabled=${this.disabled || this.loading}
        class=${classes}
      >
        ${renderButtonContent()}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-button': Button;
  }
}
