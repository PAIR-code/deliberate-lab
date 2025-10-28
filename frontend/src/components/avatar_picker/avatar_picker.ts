import {CSSResultGroup, LitElement, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import 'emoji-picker-element';

import {styles} from './avatar_picker.scss';

export interface EmojiSelectedDetail {
  value: string;
}

export const extractEmojiUnicode = (event: CustomEvent): string | null => {
  const detail = event.detail as
    | {unicode?: string | string[]; emoji?: {unicode?: string}}
    | string
    | undefined;

  if (!detail) return null;

  if (typeof detail === 'string') return detail;

  const unicode = detail.unicode;
  if (typeof unicode === 'string') return unicode;
  if (Array.isArray(unicode) && unicode.length > 0) return unicode[0];

  if (detail.emoji?.unicode) return detail.emoji.unicode;

  return null;
};

/** Reusable emoji picker trigger with popover display. */
@customElement('dl-avatar-picker')
export class AvatarPicker extends LitElement {
  static override styles: CSSResultGroup = [styles];

  /** Currently selected emoji value. */
  @property({type: String}) value: string | null = null;

  /** When true, disables the trigger button. */
  @property({type: Boolean}) disabled = false;

  /** Text displayed within the trigger button. */
  @property({type: String, attribute: 'button-label'})
  buttonLabel = 'Choose emoji';

  /** Overrides the aria-label announced by assistive tech. */
  @property({type: String, attribute: 'aria-label'})
  ariaLabel: string | null = null;

  /** Emoji shown when no value is present. */
  @property({type: String, attribute: 'placeholder-emoji'})
  placeholderEmoji = '🙂';

  /** Hides the textual label when true. */
  @property({type: Boolean, attribute: 'hide-text'})
  hideText = false;

  @state() private isOpen = false;

  private readonly handleOutsidePointerDown = (event: PointerEvent) => {
    const path = event.composedPath();
    if (!path.includes(this)) {
      this.closePicker();
    }
  };

  private readonly handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.closePicker();
    }
  };

  private openPicker() {
    if (this.isOpen || this.disabled) return;
    this.isOpen = true;
    window.addEventListener('pointerdown', this.handleOutsidePointerDown, true);
    window.addEventListener('keydown', this.handleEscapeKey, true);
  }

  private closePicker() {
    if (!this.isOpen) return;
    this.isOpen = false;
    window.removeEventListener(
      'pointerdown',
      this.handleOutsidePointerDown,
      true,
    );
    window.removeEventListener('keydown', this.handleEscapeKey, true);
  }

  private togglePicker() {
    if (this.isOpen) {
      this.closePicker();
    } else {
      this.openPicker();
    }
  }

  private handleEmojiClick(event: CustomEvent) {
    const unicode = extractEmojiUnicode(event);
    if (!unicode) return;
    this.value = unicode;
    this.dispatchEvent(
      new CustomEvent<EmojiSelectedDetail>('emoji-selected', {
        detail: {value: unicode},
        bubbles: true,
        composed: true,
      }),
    );
    this.closePicker();
  }

  override disconnectedCallback() {
    this.closePicker();
    super.disconnectedCallback();
  }

  override render() {
    const buttonLabel = this.buttonLabel;
    const ariaLabel = this.ariaLabel ?? buttonLabel;
    const emoji = this.value ?? this.placeholderEmoji;

    return html`
      <div class="picker">
        <button
          class="picker__trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded=${this.isOpen ? 'true' : 'false'}
          aria-label=${ariaLabel}
          ?disabled=${this.disabled}
          @click=${this.togglePicker}
        >
          <span class="picker__emoji">${emoji}</span>
          ${this.hideText
            ? nothing
            : html`<span class="picker__text">${buttonLabel}</span>`}
        </button>
        ${this.isOpen
          ? html`
              <div class="picker__overlay">
                <emoji-picker
                  class="picker__emoji-picker"
                  @emoji-click=${this.handleEmojiClick}
                ></emoji-picker>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dl-avatar-picker': AvatarPicker;
  }
}
