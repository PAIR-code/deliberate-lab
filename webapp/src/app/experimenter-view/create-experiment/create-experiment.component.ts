import { isEqual } from 'lodash';
import {
  ExpStage,
  getDefaultChatAboutItemsConfig,
  getDefaultLeaderRevealConfig,
  getDefaultSurveyConfig,
  getDefaultVotesConfig,
  getDefaultTosAndUserProfileConfig,
  StageKinds,
  ExpStageTosAndUserProfile,
  getDefaultItemRatingsQuestion,
  QuestionData,
  getDefaultScaleQuestion,
  ExpStageSurvey,
  SurveyQuestionKind,
} from 'src/lib/staged-exp/data-model';

import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { LocalService } from 'src/app/services/local.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppStateService } from 'src/app/services/app-state.service';
import { addExperiment } from 'src/lib/staged-exp/app';
import { makeStages } from 'src/lib/staged-exp/example-experiment';
import { tryCast } from 'src/lib/albebraic-data';

const EXISTING_STAGES_KEY = 'existing-stages';

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
  // new stuff
  public existingStages: Partial<ExpStage>[] = [];
  public currentEditingStageIndex = -1;
  public newExperimentName = '';

  readonly StageKinds = StageKinds;
  readonly SurveyQuestionKind = SurveyQuestionKind;

  readonly tryCast = tryCast;

  readonly availableStageKinds = [
    StageKinds.acceptTosAndSetProfile,
    StageKinds.takeSurvey,
    StageKinds.voteForLeader,
    StageKinds.groupChat,
    StageKinds.revealVoted,
  ];

  constructor(
    private appStateService: AppStateService,
    private localStore: LocalService,
    public router: Router
  ) {
    // new stuff
    const existingStages = this.localStore.getData(EXISTING_STAGES_KEY) as ExpStage[];
    if (existingStages) {
      this.existingStages = existingStages;
    } else {
      this.existingStages = makeStages();
    }
    this.currentEditingStageIndex = 0;
  }

  get currentEditingStage() {
    return this.existingStages[this.currentEditingStageIndex] as ExpStage;
  }

  get hasUnsavedData() {
    const existingStages = this.localStore.getData(EXISTING_STAGES_KEY) as ExpStage[];
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
    let question: QuestionData | null = null;
    if (type === 'rating') {
      question = getDefaultItemRatingsQuestion();
    } else if (type === 'scale') {
      question = getDefaultScaleQuestion();
    }
    (this.currentEditingStage as ExpStageSurvey).config.questions.push(question as QuestionData);
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

    if (!_stageData.kind) return true;
    if (!_stageData.name || _stageData.name.trim().length === 0) return true;

    if (_stageData.kind === StageKinds.acceptTosAndSetProfile) {
      return false;
      // if (_stageData.config?.tosLines.length === 0) return true;
    } else if (_stageData.kind === StageKinds.takeSurvey) {
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
    this.localStore.saveData(EXISTING_STAGES_KEY, this.existingStages);
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
    this.localStore.removeData(EXISTING_STAGES_KEY);

    this.existingStages = makeStages();
    this.persistExistingStages();

    this.currentEditingStageIndex = 0;
  }

  navigateToStage(idx: number) {
    this.currentEditingStageIndex = idx;
  }

  onChange(event: any, type?: string) {
    if (type === 'stage-kind') {
      console.log('Switched to:', this.currentEditingStage.kind);
      let newConfig = {};
      switch (this.currentEditingStage.kind) {
        case StageKinds.acceptTosAndSetProfile:
          newConfig = getDefaultTosAndUserProfileConfig();
          break;
        case StageKinds.takeSurvey:
          newConfig = getDefaultSurveyConfig();
          break;
        case StageKinds.voteForLeader:
          newConfig = getDefaultVotesConfig();
          break;
        case StageKinds.groupChat:
          newConfig = getDefaultChatAboutItemsConfig();
          break;
        case StageKinds.revealVoted:
          newConfig = getDefaultLeaderRevealConfig();
          break;
      }
      this.currentEditingStage.config = newConfig;
    }

    this.persistExistingStages();
  }

  addExperiment() {
    this.appStateService.editData((data) =>
      addExperiment(this.newExperimentName, this.existingStages as ExpStage[], data),
    );

    // Redirect to the new experiment.
    this.router.navigate(['/experimenter', 'experiment', this.newExperimentName]);
    // console.log(this.localStore.getData(EXISTING_STAGES_KEY));
    // this.appStateService.addExperiment()
    // this.appStateService.reset(this.localStore.getData(EXISTING_STAGES_KEY) as ExpStage[]);
  }
}
