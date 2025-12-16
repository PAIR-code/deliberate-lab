import '../../pair-components/icon_button';
import './template_gallery';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {HomeService} from '../../services/home.service';
import {styles} from './templates_dialog.scss';

@customElement('templates-dialog')
export class TemplatesDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly homeService = core.getService(HomeService);

  private onClose() {
    this.homeService.setTemplatesOpen(false);
  }

  override updated() {
    this.style.display = this.homeService.isTemplatesOpen ? 'flex' : 'none';
  }

  override render() {
    if (!this.homeService.isTemplatesOpen) return html``;

    return html`
      <div class="dialog">
        <div class="header">
          <div>Experiment Templates</div>
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            @click=${() => this.onClose()}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          <template-gallery></template-gallery>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'templates-dialog': TemplatesDialog;
  }
}
