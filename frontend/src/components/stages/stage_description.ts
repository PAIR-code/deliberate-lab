import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {StageConfig} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './stage_description.scss';

/** Base stage description for participants. */
@customElement('stage-description')
export class StageDescription extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: StageConfig | null = null;
  @property({type: Boolean}) noBorder = false;
  @property({type: Boolean}) noPadding = false;

  override render() {
    if (!this.stage || this.stage.descriptions.primaryText.length === 0) {
      return nothing;
    }

    const descriptionClasses = classMap({
      'description-wrapper': true,
      border: !this.noBorder,
      padding: !this.noPadding,
    });

    return html`
      <div class=${descriptionClasses}>
        <div class="description html-wrapper">
          ${unsafeHTML(
            convertMarkdownToHTML(this.stage.descriptions.primaryText),
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-description': StageDescription;
  }
}
