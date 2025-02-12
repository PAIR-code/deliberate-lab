import '../../pair-components/menu';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  SurveyStageConfig,
  SurveyQuestion,
  StageKind,
  createCheckSurveyQuestion,
  createMultipleChoiceSurveyQuestion,
  createScaleSurveyQuestion,
  createTextSurveyQuestion,
} from '@deliberation-lab/utils';

import {styles} from './survey_editor_menu.scss';

/** Survey editor menu for adding survey questions. */
@customElement('survey-editor-menu')
export class SurveyEditorMenu extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: SurveyStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <pr-menu
        name="Add survey question"
        ?disabled=${!this.experimentEditor.canEditStages}
      >
        <div class="menu-wrapper">
          <div class="menu-item" role="button" @click=${this.addText}>
            Freeform
          </div>
          <div class="menu-item" role="button" @click=${this.addCheck}>
            Checkbox
          </div>
          <div class="menu-item" role="button" @click=${this.addMultipleChoice}>
            Multiple choice
          </div>
          <div class="menu-item" role="button" @click=${this.addScale}>
            Scale
          </div>
        </div>
      </pr-menu>
    `;
  }

  private addQuestion(question: SurveyQuestion) {
    if (!this.stage) return;

    const questions = [...this.stage.questions, question];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private addText() {
    this.addQuestion(createTextSurveyQuestion());
  }

  private addCheck() {
    this.addQuestion(createCheckSurveyQuestion());
  }

  private addMultipleChoice() {
    this.addQuestion(createMultipleChoiceSurveyQuestion());
  }

  private addScale() {
    this.addQuestion(createScaleSurveyQuestion());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-editor-menu': SurveyEditorMenu;
  }
}
