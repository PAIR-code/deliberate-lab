import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './popup.scss';

/**
 * Blocking pop-up shown when a turn-based chat agent's model call fails to
 * return within the stage's response deadline. Tells the participant the
 * error was recorded and compensation is unaffected, and shows the study's
 * debrief when the experiment's last stage is named "Debrief".
 */
@customElement('api-failure-popup')
class ApiFailurePopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  // Markdown of the experiment's debrief stage (empty = no debrief to show).
  @property() debriefText = '';

  render() {
    return html`
      <div class="overlay">
        <div class="popup constrained">
          <div class="title">
            The chatbot is not currently working due to technical issues. The
            error has been recorded, and you will receive full compensation for
            the study. You can exit the study and return to the platform (e.g.,
            Prolific).
          </div>
          ${this.debriefText
            ? html`<div class="body">
                ${unsafeHTML(convertMarkdownToHTML(this.debriefText))}
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'api-failure-popup': ApiFailurePopup;
  }
}
