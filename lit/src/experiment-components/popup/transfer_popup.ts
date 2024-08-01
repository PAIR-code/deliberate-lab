import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {styles} from './popup.scss';

@customElement('transfer-popup')
class TransferPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Boolean}) open = false;

  render() {
    if (!this.open) return null;
    return html`
      <div class="overlay">
        <div class="popup">
          <p>You have been transferred to a new experiment!</p>
          <pr-button color="secondary" variant="tonal" @click=${this.handleYes}>Join the experiment</button>
        </div>
      </div>
    `;
  }

  private handleYes() {
    this.dispatchEvent(new CustomEvent('confirm-transfer'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-popup': TransferPopup;
  }
}
