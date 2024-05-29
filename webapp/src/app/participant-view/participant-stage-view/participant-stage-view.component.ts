/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import {
  AfterViewInit,
  Component,
  Injector,
  ViewChild,
  ViewContainerRef,
  computed,
  effect,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { StageKind, lockPromise } from '@llm-mediation-experiments/utils';
import {
  ParticipantService,
  ViewingStage,
  assertCastStageSignals,
} from 'src/app/services/participant.service';
import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpInfoComponent } from './exp-info/exp-info.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';

/**
 * This generic stage route ('participant/:experimentId/:participantId') is reused for all stages.
 * Thus, we need to handle all different stage components in this single components.
 *
 * The strategy used here is to lazily create component when the stage is viewed.
 * Existing components are then hidden when their stage is not the one being currently viewed.
 * This ensures that:
 * 1. Components are created only once, with the correct data, and their data never changes.
 * 2. Components can be created with injection, in order to make their args accessible straight from
 * the constructor in order to handle easily complex logic.
 * 3. Components are created lazily, so that the app does not have to load all components at once.
 * 4. Components are never reused to display different stages, breaking the previous stage logic.
 */

@Component({
  selector: 'app-participant-stage-view',
  standalone: true,
  imports: [
    ExpChatComponent,
    ExpInfoComponent,
    ExpLeaderVoteComponent,
    ExpSurveyComponent,
    ExpTosComponent,
    ExpProfileComponent,
    ExpLeaderRevealComponent,
    MatButtonModule,
  ],
  templateUrl: './participant-stage-view.component.html',
  styleUrl: './participant-stage-view.component.scss',
})
export class ParticipantStageViewComponent implements AfterViewInit {
  @ViewChild('stagesContainer', { read: ViewContainerRef })
  stagesContainer!: ViewContainerRef;

  // Monitor the stages that have been created to avoid duplicates
  private createdStageNames: Set<string> = new Set();

  private viewContainerRefLoaded = lockPromise();

  readonly StageKind = StageKind;
  readonly assertCast = assertCastStageSignals;

  constructor(public readonly participantService: ParticipantService) {
    effect(() => {
      const data = this.participantService.viewingStage();
      if (data) {
        this.createComponent(data);
      }
    });
  }

  // Create the component effect when the view is initialized and ViewContainerRef is available
  ngAfterViewInit(): void {
    this.viewContainerRefLoaded.resolve();
  }

  /** Create a component depending on the passed stage data */
  async createComponent(data: ViewingStage) {
    if (this.createdStageNames.has(data.config().name)) {
      return;
    }

    this.createdStageNames.add(data.config().name);

    await this.viewContainerRefLoaded.promise;

    const customInjector = Injector.create({
      providers: [
        { provide: 'stage', useValue: data },
        {
          provide: 'hidden',
          useValue: computed(
            () => data.config().name !== this.participantService.viewingStage()?.config().name,
          ),
        },
      ],
      parent: this.stagesContainer.injector,
    });

    const Component = getComponentForKind(data.config().kind) as typeof ExpTosComponent;
    this.stagesContainer.createComponent(Component, { injector: customInjector });
  }
}

/** Helper method to get the right component */
const getComponentForKind = (kind: StageKind) => {
  switch (kind) {
    case StageKind.TermsOfService:
      return ExpTosComponent;
    case StageKind.Info:
      return ExpInfoComponent;
    case StageKind.SetProfile:
      return ExpProfileComponent;
    case StageKind.TakeSurvey:
      return ExpSurveyComponent;
    case StageKind.GroupChat:
      return ExpChatComponent;
    case StageKind.VoteForLeader:
      return ExpLeaderVoteComponent;
    case StageKind.RevealVoted:
      return ExpLeaderRevealComponent;
  }
};
