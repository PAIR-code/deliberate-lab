import './pair-components/button';

import './experiment-components/attention_check/attention_check_popup';
import './experiment-components/chat/basic_chat';
import './experiment-components/chat/lost_at_sea_chat';
import './experiment-components/election/election_preview';
import './experiment-components/experiment/experiment_config';
import './experiment-components/experiment/experiment_config_sidenav';
import './experiment-components/experiment/experiment_preview';
import './experiment-components/games/lost_at_sea/las_survey_preview';
import './experiment-components/info/info_preview';
import './experiment-components/mediators/mediator_chat_panel';
import './experiment-components/payout/payout_preview';
import './experiment-components/profile/profile_config';
import './experiment-components/reveal/reveal_preview';
import './experiment-components/sidenav/sidenav';
import './experiment-components/survey/survey_preview';
import './experiment-components/tos/tos_preview';

import './components/header/header';
import './components/landing/experiment_group';
import './components/landing/experiment_landing';
import './components/login/login';
import './components/settings/settings';
import './components/sidenav/sidenav';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from './core/core';
import {AuthService} from './services/auth_service';
import {ChatService} from './services/chat_service';
import {ExperimentService} from './services/experiment_service';
import {ParticipantService} from './services/participant_service';
import {Pages, RouterService} from './services/router_service';
import {SettingsService} from './services/settings_service';
import {SurveyService} from './services/survey_service';

import {ChatKind, StageKind} from '@llm-mediation-experiments/utils';
import {ColorMode, ColorTheme, TextSize} from './shared/types';

import {styles} from './app.scss';

/** App main component. */
@customElement('llm-mediation-app')
export class App extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);
  private readonly settingsService = core.getService(SettingsService);
  private readonly surveyService = core.getService(SurveyService);

  override connectedCallback() {
    super.connectedCallback();
  }

  private renderPageContent() {
    switch (this.routerService.activePage) {
      case Pages.HOME:
        return html`
          <div class="content">
            <experiment-landing-page></experiment-landing-page>
          </div>
        `;
      case Pages.SETTINGS:
        return html`
          <div class="content">
            <settings-page .showAccount=${true}></settings-page>
          </div>
        `;
      case Pages.EXPERIMENT:
        return this.renderExperiment();
      case Pages.EXPERIMENT_GROUP:
        return html` <div class="content">
          <experiment-group-page></experiment-group-page>
        </div>`;
      case Pages.EXPERIMENT_CREATE:
        return html`
          <div class="participant-content-wrapper">
            <experiment-config-sidenav></experiment-config-sidenav>
            <div class="participant-content">
              <experiment-config></experiment-config>
            </div>
          </div
        `;
      case Pages.PARTICIPANT:
        return this.renderParticipantView(this.renderParticipant());
      case Pages.PARTICIPANT_STAGE:
        if (
          !this.authService.isExperimenter &&
          this.experimentService.experiment?.attentionCheckParams
        ) {
          return html` <attention-check-popup
              waitSeconds=${this.experimentService.experiment
                ?.attentionCheckParams.waitSeconds}
              popupSeconds=${this.experimentService.experiment
                ?.attentionCheckParams.popupSeconds}
            ></attention-check-popup>
            ${this.renderParticipantView(this.renderParticipantStage())}`;
        }
        return this.renderParticipantView(this.renderParticipantStage());
      case Pages.PARTICIPANT_SETTINGS:
        return this.renderParticipantView(this.renderParticipantSettings());
      default:
        return this.render404();
    }
  }

  private render404(message = 'Page not found') {
    return html`<div>404: ${message}</div>`;
  }

  private render403(message = 'Participants do not have access') {
    return html`<div>403: ${message}</div>`;
  }

  private renderExperiment() {
    this.experimentService.updateForCurrentRoute();

    if (this.experimentService.isLoading) {
      return html`<div>Loading experiment...</div>`;
    }

    if (this.experimentService.experiment === undefined) {
      return html`<div>Could not load experiment</div>`;
    }

    return html`
      <div class="content">
        <experiment-preview></experiment-preview>
      </div>
    `;
  }

  private renderParticipantView(content: TemplateResult<1>) {
    return html`
      <div class="participant-content-wrapper">
        <participant-sidenav></participant-sidenav>
        <div class="participant-content">${content}</div>
      </div>
    `;
  }

  private renderParticipant() {
    this.experimentService.updateForCurrentRoute();
    this.participantService.updateForCurrentRoute();

    if (this.experimentService.isLoading || this.participantService.isLoading) {
      return html`<div>Loading experiment...</div>`;
    }

    if (this.experimentService.experiment === undefined) {
      return this.render404(`Could not find experiment`);
    }

    if (this.participantService.profile === undefined) {
      return this.render404(`Could not find participant ID`);
    }

    const routeToStage = () => {
      this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
        experiment: this.participantService.experimentId!,
        participant: this.participantService.participantId!,
        stage: this.participantService.profile?.currentStageId!,
      });
    };

    if (this.experimentService.canStartExperiment()) {
      return html`
        <pr-button @click=${routeToStage}>Start experiment</pr-button>
      `;
    } else {
      return html`Waiting for other participants to join before the experiment
      can begin.`;
    }
  }

  private renderParticipantSettings() {
    this.experimentService.updateForCurrentRoute();
    this.participantService.updateForCurrentRoute();

    if (this.experimentService.isLoading || this.participantService.isLoading) {
      return html`<div>Loading experiment...</div>`;
    }

    if (this.experimentService.experiment === undefined) {
      return this.render404(`Could not find experiment`);
    }

    if (this.participantService.profile === undefined) {
      return this.render404(`Could not find participant ID`);
    }

    return html`<settings-page></settings-page>`;
  }

  private renderParticipantStage() {
    this.experimentService.updateForCurrentRoute();
    this.participantService.updateForCurrentRoute();

    if (this.experimentService.isLoading || this.participantService.isLoading) {
      return html`<div>Loading experiment stage...</div>`;
    }

    if (this.experimentService.experiment === undefined) {
      return this.render404(`Could not find experiment`);
    }

    if (this.participantService.profile === undefined) {
      return this.render404(`Could not find participant ID`);
    }

    const stageId = this.routerService.activeRoute.params['stage'];
    const currentStage = this.experimentService.getStage(stageId);

    if (currentStage === undefined) {
      return this.render404(`Could not find experiment stage "${stageId}""`);
    }

    const isLockedStage = (stageId: string) => {
      const stageIndex = this.experimentService.getStageIndex(stageId);
      const currentStageIndex = this.experimentService.getStageIndex(
        this.participantService.profile?.currentStageId!
      );
      return stageIndex > currentStageIndex;
    };

    const navigateToCurrentStage = () => {
      this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
        experiment: this.participantService.experimentId!,
        participant: this.participantService.participantId!,
        stage: this.participantService.profile?.currentStageId!,
      });
    };

    if (isLockedStage(stageId)) {
      return html`
        <div class="error-wrapper">
          ${this.render403('This stage is not yet available')}
          <pr-button @click=${navigateToCurrentStage}>
            Go to current stage
          </pr-button>
        </div>
      `;
    }

    const answer = this.participantService.stageAnswers[currentStage.id];

    switch (currentStage.kind) {
      case StageKind.Info:
        return html`<info-preview .stage=${currentStage}></info-preview>`;
      case StageKind.TermsOfService:
        return html`<tos-preview .stage=${currentStage}></tos-preview>`;
      case StageKind.TakeSurvey:
        this.surveyService.updateForCurrentRoute();
        return html`
          <survey-preview .stage=${currentStage} .answer=${answer}>
          </survey-preview>
        `;
      case StageKind.LostAtSeaSurvey:
        return html`
          <las-survey-preview
            .stage=${currentStage}
            .answer=${answer}
          ></las-survey-preview>
        `;
      case StageKind.SetProfile:
        return html`<profile-config></profile-config>`;
      case StageKind.VoteForLeader:
        return html`<election-preview .answer=${answer}></election-preview>`;
      case StageKind.Payout:
        return html`<payout-preview .stage=${currentStage}></payout-preview>`;
      case StageKind.Reveal:
        return html`<reveal-preview .stage=${currentStage}></reveal-preview>`;
      case StageKind.GroupChat:
        this.chatService.updateForCurrentRoute();

        if (currentStage.chatConfig.kind === ChatKind.ChatAboutItems) {
          return html`<lost-at-sea-chat
            .stage=${currentStage}
          ></lost-at-sea-chat>`;
        } else {
          return html`<basic-chat .stage=${currentStage}></basic-chat>`;
        }
      default:
        return this.render404('Could not load experiment stage');
    }
  }

  override render() {
    const isMode = (mode: ColorMode) => {
      return this.settingsService.colorMode === mode;
    };

    const isTheme = (theme: ColorTheme) => {
      return this.settingsService.colorTheme === theme;
    };

    const isSize = (size: TextSize) => {
      return this.settingsService.textSize === size;
    };

    const classes = classMap({
      'app-wrapper': true,
      'mode--dark': isMode(ColorMode.DARK),
      'mode--light': isMode(ColorMode.LIGHT),
      'mode--default': isMode(ColorMode.DEFAULT),
      'size--small': isSize(TextSize.SMALL),
      'size--medium': isSize(TextSize.MEDIUM),
      'size--large': isSize(TextSize.LARGE),
    });

    if (
      !this.authService.authenticated &&
      !this.routerService.isParticipantPage &&
      this.routerService.activeRoute.params['experiment'] === undefined
    ) {
      // Render login screen if relevant after initial auth check
      return html`
        <div class=${classes}>
          <div class="content">
            ${this.authService.initialAuthCheck
              ? html`<login-page></login-page>`
              : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class=${classes}>
        <main>
          <sidenav-menu></sidenav-menu>
          <mediator-chat-panel></mediator-chat-panel>
          <div class="content-wrapper">
            <page-header></page-header>
            ${this.renderPageContent()}
          </div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'llm-mediation-app': App;
  }
}
