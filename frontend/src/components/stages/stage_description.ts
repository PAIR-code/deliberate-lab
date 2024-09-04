import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {StageConfig} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './stage_description.scss';

/** Base stage description for participants. */
@customElement('stage-description')
export class StageDescription extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: StageConfig | null = null;

  override render() {
    if (!this.stage || this.stage.descriptions.primaryText.length === 0) {
      return nothing;
    }

    return html`
      <div class="description html-wrapper">
        ${unsafeHTML(convertMarkdownToHTML(this.stage.descriptions.primaryText))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-description': StageDescription;
  }
}
