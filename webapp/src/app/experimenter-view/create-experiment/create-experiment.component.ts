import { isEqual } from 'lodash';

import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { LocalService } from 'src/app/services/local.service';
import { tryCast } from 'src/lib/algebraic-data';
import { createExperimentMutation, createTemplateMutation } from 'src/lib/api/mutations';
import { templatesQuery } from 'src/lib/api/queries';
import { getDefaultChatAboutItemsConfig } from 'src/lib/types/chats.types';
import { Template } from 'src/lib/types/experiments.types';
import {
  Question,
  SurveyQuestionKind,
  getDefaultItemRatingsQuestion,
  getDefaultScaleQuestion,
  getDefaultSurveyConfig,
  getDefaultTosAndUserProfileConfig,
} from 'src/lib/types/questions.types';
import {
  ExpStage,
  ExpStageSurvey,
  ExpStageTosAndUserProfile,
  StageKind,
  generateAllowedStageProgressionMap,
} from 'src/lib/types/stages.types';
import { getDefaultLeaderRevealConfig, getDefaultVotesConfig } from 'src/lib/types/votes.types';
import { lookupTable } from 'src/lib/utils/object.utils';

const LOCAL_STORAGE_KEY = 'ongoing-experiment-creation';

const getInitStageData = (): Partial<ExpStage> => {
  return { name: '' };
};

@Component({
  selector: 'app-create-experiment',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './create-experiment.component.html',
  styleUrl: './create-experiment.component.scss',
})
export class CreateExperimentComponent {
  client = injectQueryClient();

  createExp = createExperimentMutation(this.client, ({ uid }) => {
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear local storage
    this.router.navigate(['/experimenter', 'experiment', uid]);
  });

  createTemplate = createTemplateMutation(this.client, () => {
    this.resetExistingStages(); // Reset after setting as template
  });

  templates = templatesQuery();

  public existingStages: Partial<ExpStage>[] = [];
  public currentEditingStageIndex = -1;
  public newExperimentName = '';
  public currentTemplate: Template | null = null;

  // Make these fields available in the template
  readonly StageKind = StageKind;
  readonly SurveyQuestionKind = SurveyQuestionKind;
  readonly tryCast = tryCast;
  readonly availableStageKind = [
    StageKind.AcceptTosAndSetProfile,
    StageKind.TakeSurvey,
    StageKind.VoteForLeader,
    StageKind.GroupChat,
    StageKind.RevealVoted,
  ];

  constructor(
    private router: Router,
    private localStore: LocalService,
  ) {
    // Set the current experiment template to the first fetched template
    effect(() => {
      const data = this.templates.data()?.data;

      if (data && this.existingStages.length === 0) {
        // Set the current stages to this template's stages
        this.currentTemplate = data[0];
        this.existingStages = Object.values(this.currentTemplate.stageMap);
        this.persistExistingStages();
      }
    });

    const existingStages = this.localStore.getData(LOCAL_STORAGE_KEY) as ExpStage[];
    if (existingStages) {
      this.existingStages = existingStages;
    }

    this.currentEditingStageIndex = 0;
  }

  get currentEditingStage() {
    const stage = this.existingStages[this.currentEditingStageIndex];

    return stage === undefined ? undefined : (stage as ExpStage);
  }

  get hasUnsavedData() {
    const existingStages = this.localStore.getData(LOCAL_STORAGE_KEY) as ExpStage[];
    return !isEqual(existingStages, this.existingStages);
  }

  // tos lines
  addNewTosLine(stage: ExpStageTosAndUserProfile) {
    stage.config.tosLines.push('');
    this.persistExistingStages();
  }

  deleteTosLine(stage: ExpStageTosAndUserProfile, index: number) {
    stage.config.tosLines.splice(index, 1);
    this.persistExistingStages();
  }

  dropTosLine(stage: ExpStageTosAndUserProfile, event: CdkDragDrop<string[]>) {
    moveItemInArray(stage.config.tosLines, event.previousIndex, event.currentIndex);

    this.persistExistingStages();
  }

  // survey questions
  addNewSurveyQuestion(event: Event, type: 'rating' | 'scale') {
    let question: Question | null = null;
    if (type === 'rating') {
      question = getDefaultItemRatingsQuestion();
    } else if (type === 'scale') {
      question = getDefaultScaleQuestion();
    }
    (this.currentEditingStage as ExpStageSurvey).config.questions.push(question as Question);
    this.persistExistingStages();
  }

  deleteSurveyQuestion(event: Event, index: number) {
    (this.currentEditingStage as ExpStageSurvey).config.questions.splice(index, 1);
    this.persistExistingStages();
  }

  moveSurveyQuestion(direction: 'up' | 'down', questionIndex: number) {
    if (questionIndex === 0 && direction === 'up') return;
    if (
      questionIndex === (this.currentEditingStage as ExpStageSurvey).config?.questions.length - 1 &&
      direction === 'down'
    )
      return;

    moveItemInArray(
      (this.currentEditingStage as ExpStageSurvey).config.questions,
      questionIndex,
      direction === 'up' ? questionIndex - 1 : questionIndex + 1,
    );
  }

  dropSurveyQuestion(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      (this.currentEditingStage as ExpStageSurvey).config.questions,
      event.previousIndex,
      event.currentIndex,
    );

    this.persistExistingStages();
  }

  stageSetupIncomplete(stageData?: Partial<ExpStage>) {
    const _stageData = stageData || this.currentEditingStage;
    if (!_stageData) return true;

    if (!_stageData.kind) return true;
    if (!_stageData.name || _stageData.name.trim().length === 0) return true;

    if (_stageData.kind === StageKind.AcceptTosAndSetProfile) {
      return false;
      // if (_stageData.config?.tosLines.length === 0) return true;
    } else if (_stageData.kind === StageKind.TakeSurvey) {
      if (_stageData.config?.questions.length === 0) return true;
    }

    return false;
  }

  experimentSetupIncomplete() {
    if (this.newExperimentName.trim().length === 0) {
      return true;
    }
    return this.existingStages.some((stage) => this.stageSetupIncomplete(stage));
  }

  persistExistingStages() {
    this.localStore.saveData(LOCAL_STORAGE_KEY, this.existingStages);
  }

  dropStage(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.existingStages, event.previousIndex, event.currentIndex);
    this.persistExistingStages();

    this.navigateToStage(event.currentIndex);
  }

  addNewStage() {
    this.existingStages.push(getInitStageData());
    this.persistExistingStages();

    this.currentEditingStageIndex = this.existingStages.length - 1;
  }

  deleteStage(event: Event, index: number) {
    event.stopPropagation();

    if (this.existingStages.length === 1) {
      // only one left
      this.existingStages[0] = getInitStageData();
    } else {
      if (this.currentEditingStageIndex >= index) {
        this.currentEditingStageIndex -= 1;
      }
      this.existingStages.splice(index, 1);
    }

    this.persistExistingStages();
  }

  resetExistingStages() {
    this.localStore.removeData(LOCAL_STORAGE_KEY);

    if (this.currentTemplate !== null) {
      this.existingStages = Object.values(this.currentTemplate.stageMap);
    } else {
      // We assume that the user cannot click on reset when the page has not fully loaded
      this.existingStages = Object.values(this.templates.data()!.data[0]?.stageMap ?? {});
    }

    this.persistExistingStages();

    this.currentEditingStageIndex = 0;
  }

  navigateToStage(idx: number) {
    this.currentEditingStageIndex = idx;
  }

  onChange(event: unknown, type?: string) {
    if (!this.currentEditingStage) return;

    if (type === 'stage-kind') {
      console.log('Switched to:', this.currentEditingStage.kind);
      let newConfig = {};
      switch (this.currentEditingStage.kind) {
        case StageKind.AcceptTosAndSetProfile:
          newConfig = getDefaultTosAndUserProfileConfig();
          break;
        case StageKind.TakeSurvey:
          newConfig = getDefaultSurveyConfig();
          break;
        case StageKind.VoteForLeader:
          newConfig = getDefaultVotesConfig();
          break;
        case StageKind.GroupChat:
          newConfig = getDefaultChatAboutItemsConfig();
          break;
        case StageKind.RevealVoted:
          newConfig = getDefaultLeaderRevealConfig();
          break;
      }
      this.currentEditingStage.config = newConfig;
    }

    this.persistExistingStages();
  }

  /** When selecting a template, reset everything */
  resetToTemplate(template: Template) {
    this.existingStages = Object.values(template.stageMap);
    this.persistExistingStages();
  }

  compareTemplates(a: Template, b: Template) {
    return a.uid === b.uid;
  }

  /** Create the experiment and send it to be stored in the database */
  addExperiment() {
    const stages = this.existingStages as ExpStage[];

    this.createExp.mutate({
      name: this.newExperimentName,
      numberOfParticipants: 3, // TODO: provide a way to parametrize this ?
      allowedStageProgressionMap: generateAllowedStageProgressionMap(stages),
      stageMap: lookupTable(stages, 'name'),
    });
  }

  addTemplate() {
    const stages = this.existingStages as ExpStage[];

    this.createTemplate.mutate({
      name: this.newExperimentName,
      allowedStageProgressionMap: generateAllowedStageProgressionMap(stages),
      stageMap: lookupTable(stages, 'name'),
    });
  }
}
