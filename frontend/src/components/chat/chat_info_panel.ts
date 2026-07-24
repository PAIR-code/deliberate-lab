import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../../pair-components/textarea';
import '../../pair-components/button';
import '../participant_profile/avatar_icon';
import '../participant_profile/profile_display';
import '../stages/stage_description';
import '../stages/stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {
  ChatStageConfig,
  ChatStagePublicData,
  MediatorProfile,
  ParticipantProfile,
  ParticipantProfileExtended,
  convertUnifiedTimestampToTime,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {getChatStartTimestamp} from '../../shared/stage.utils';
import {
  getHashBasedColor,
  variableAssignmentsIncludeObserver,
  MEDIATOR_OBSERVER_COLOR,
} from '../../shared/utils';
import {styles} from './chat_info_panel.scss';

// 7-point Likert scale (top-to-bottom), most to least positive (so "like" is
// at the top). The stored value (1-7) is unchanged; only the display order is
// reversed.
const QUIZ_LIKERT_OPTIONS: {value: number; label: string}[] = [
  {value: 7, label: 'Strongly like'},
  {value: 6, label: 'Like'},
  {value: 5, label: 'Somewhat like'},
  {value: 4, label: 'Neutral'},
  {value: 3, label: 'Somewhat dislike'},
  {value: 2, label: 'Dislike'},
  {value: 1, label: 'Strongly dislike'},
];

/** Chat panel view with stage info, timer, participants. */
@customElement('chat-info-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChatStageConfig | null = null;
  @property({type: Boolean}) topLayout = false;
  @state() isStatusLoading = false;

  // Observer-specific avatar coloring (mediators shown blue; that blue
  // reserved away from other participants) only applies when the experiment
  // assigns the `_isObserver` treatment variable.
  private get reserveMediatorColor(): boolean {
    return variableAssignmentsIncludeObserver(
      this.cohortService.activeParticipants,
    );
  }

  // Quiz state.
  // Selected 7-point Likert value (1-7), or null if unselected.
  @state() private quizRating: number | null = null;
  // Highest quiz checkpoint the participant has already answered. The backend
  // publishes the authoritative pause checkpoint (quizPauseCheckpoint); the
  // popup shows whenever it leads this local answered count.
  @state() private quizAnsweredCheckpoint = 0;

  // Backend-authoritative pause checkpoint for this stage (0 = not paused).
  private get quizPauseCheckpoint(): number {
    if (!this.stage) return 0;
    const publicData = this.cohortService.stagePublicDataMap[this.stage.id] as
      | ChatStagePublicData
      | undefined;
    return publicData?.quizPauseCheckpoint ?? 0;
  }

  // The quiz shows whenever the backend has paused the chat at a checkpoint
  // the participant has not yet answered. The backend pause is authoritative,
  // so the popup can never outrun the participant (the "2nd submit does
  // nothing" bug): each pause raises quizPauseCheckpoint by exactly one.
  private get showQuiz(): boolean {
    return (
      this.participantService.profile?.isQuizzed === true &&
      this.quizPauseCheckpoint > this.quizAnsweredCheckpoint
    );
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    if (this.topLayout) {
      // The narrow layout has no side panel, so the quiz renders here, above
      // the roster. Otherwise a paused chat would have no answerable quiz.
      return html`
        <div class="top-layout">
          ${this.showQuiz ? this.renderQuiz() : nothing}
          ${this.renderParticipantList(true)}
        </div>
      `;
    }

    const showQuiz = this.showQuiz;
    // When an observer is present in the cohort, participant labels gain a
    // "(yours)" suffix and representative agent names get long, so widen the
    // panel to accommodate them.
    const observerPresent = this.cohortService.activeParticipants.some(
      (p) => p.isObserver,
    );

    return html`
      <div class="side-layout">
        <stage-description .stage=${this.stage} noPadding> </stage-description>
        ${showQuiz ? this.renderQuiz() : nothing} ${this.renderTimer()}
        ${this.renderParticipantList()}
      </div>
    `;
  }

  private renderTimer() {
    if (!this.stage) return nothing;

    const publicStageData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as ChatStagePublicData;
    if (!publicStageData || !this.stage.timeLimitInMinutes) return nothing;

    const renderStatus = () => {
      if (!publicStageData.discussionStartTimestamp) {
        return nothing;
      }

      const end = publicStageData.discussionEndTimestamp;
      if (end) {
        return html`(ended at ${convertUnifiedTimestampToTime(end, false)})`;
      }

      const start = getChatStartTimestamp(
        this.stage?.id ?? '',
        this.cohortService.chatMap,
      );
      if (!start) return nothing;
      return html`(started at ${convertUnifiedTimestampToTime(start, false)})`;
    };

    return html`
      <div
        class=${`countdown ${publicStageData.discussionEndTimestamp ? 'ended' : ''}`}
      >
        ⏱️ Timer: ${this.stage.timeLimitInMinutes} minutes ${renderStatus()}
        ${this.stage.timeMinimumInMinutes &&
        !publicStageData.discussionEndTimestamp &&
        publicStageData.discussionStartTimestamp &&
        getTimeElapsed(publicStageData.discussionStartTimestamp, 'm') <
          this.stage.timeMinimumInMinutes
          ? (() => {
              const remaining = Math.ceil(
                this.stage.timeMinimumInMinutes -
                  getTimeElapsed(
                    publicStageData.discussionStartTimestamp!,
                    'm',
                  ),
              );
              return `You must stay in this chat for at least ${remaining} more minute${remaining !== 1 ? 's' : ''}.`;
            })()
          : ''}
      </div>
      ${this.topLayout ? nothing : html`<div class="divider"></div>`}
    `;
  }

  private renderParticipantList(topLayout = false) {
    const activeParticipants = this.cohortService.activeParticipants.filter(
      // Inactive personas supply stored content to agents and never appear
      // in the chat, so exclude them from the roster too. The map is
      // populated from the full participant docs (see cohort.service), so
      // agentConfig is present at runtime even though the static type is the
      // public ParticipantProfile.
      (p) =>
        !p.isObserver &&
        !(p as ParticipantProfileExtended).agentConfig?.isInactivePersona,
    );
    const mediators = this.cohortService.getMediatorsForStage(
      this.stage?.id ?? '',
    );

    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="panel-item">
        <div class="panel-item-title">
          <div>
            Participants (${activeParticipants.length + mediators.length})
          </div>
          ${topLayout ? this.renderTimer() : nothing}
        </div>
        <div class="panel-list ${topLayout ? 'wrap' : ''}">
          ${activeParticipants.map((participant) =>
            this.renderProfile(participant, topLayout),
          )}
          ${mediators.map((mediator) =>
            this.renderMediator(mediator, topLayout),
          )}
        </div>
      </div>
    `;
  }

  private get currentTurnParticipantId(): string | null {
    if (!this.stage?.isTurnBased) return null;
    const data = this.cohortService.stagePublicDataMap[this.stage.id] as
      | ChatStagePublicData
      | undefined;
    return data?.currentTurnParticipantId ?? null;
  }

  private renderMediator(profile: MediatorProfile, small = false) {
    // TODO: Calculate if mediator is out of messages (maxResponses)
    const isCurrentTurn = this.currentTurnParticipantId === profile.publicId;
    return html`
      <div class="profile-row">
        <span class="turn-indicator ${isCurrentTurn ? 'visible' : ''}">👉</span>
        <div class="profile">
          <profile-display
            .profile=${profile}
            .color=${this.reserveMediatorColor
              ? MEDIATOR_OBSERVER_COLOR
              : getHashBasedColor(profile.publicId ?? '')}
            displayType=${small ? 'chatSmall' : 'chat'}
          >
          </profile-display>
        </div>
      </div>
    `;
  }

  private renderProfile(profile: ParticipantProfile, small = false) {
    const isCurrent =
      profile.publicId === this.participantService.profile?.publicId;
    const isCurrentTurn = this.currentTurnParticipantId === profile.publicId;
    return html`
      <div class="profile-row">
        <span class="turn-indicator ${isCurrentTurn ? 'visible' : ''}">👉</span>
        <participant-profile-display
          .stageId=${this.stage?.id ?? ''}
          .stageName=${this.stage?.name ?? ''}
          .profile=${profile}
          .showIsSelf=${isCurrent}
          .excludeColors=${this.reserveMediatorColor
            ? [MEDIATOR_OBSERVER_COLOR]
            : []}
          displayType=${small ? 'chatSmall' : 'chat'}
        >
        </participant-profile-display>
      </div>
    `;
  }

  private setQuizRating(rating: number) {
    this.quizRating = rating;
  }

  private async submitQuiz() {
    if (this.quizRating === null) return;
    const rating = this.quizRating;
    const checkpoint = this.quizPauseCheckpoint;
    const text = this.participantService.quizText.trim();
    // Pass the backend's current pause checkpoint so the endpoint clears it and
    // resumes the stalled turn; the Likert value is saved as a structured field.
    await this.participantService.submitParticipantThought(
      text,
      checkpoint,
      rating,
    );
    // Advance exactly one checkpoint so no quiz is ever skipped; the form resets
    // (submitParticipantThought clears quizText).
    this.quizAnsweredCheckpoint = this.quizAnsweredCheckpoint + 1;
    this.quizRating = null;
  }

  // Submit the quiz on Enter (Shift+Enter still inserts a newline) once the
  // Likert rating and a non-empty answer are both present, matching the submit
  // button's enabled state. keydown is composed, so it reaches this host
  // listener from the inner <textarea>; quizText is already current
  // because pr-textarea fires change on every input.
  private onQuizKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const text = this.participantService.quizText.trim();
    const canSubmit =
      this.quizRating !== null &&
      text !== '' &&
      !this.participantService.isSubmittingThought;
    if (!canSubmit) return;
    e.preventDefault();
    this.submitQuiz();
  }

  // Tracks the pause checkpoint the form was last reset for, so a new pause
  // clears any stale rating/text from the previous quiz.
  private lastResetPauseCheckpoint = 0;

  override willUpdate() {
    const pause = this.quizPauseCheckpoint;
    if (pause > this.lastResetPauseCheckpoint) {
      this.lastResetPauseCheckpoint = pause;
      this.quizRating = null;
      this.participantService.setQuizText('');
    }
  }

  private renderQuiz() {
    const text = this.participantService.quizText;
    const isSubmitting = this.participantService.isSubmittingThought;
    const canSubmit =
      this.quizRating !== null && text.trim() !== '' && !isSubmitting;
    const quizQuestion = 'Do you like the process so far?';
    return html`
      <div class="quiz-section">
        <div class="quiz-question">${quizQuestion}</div>
        <div class="quiz-likert">
          ${QUIZ_LIKERT_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="likert-option ${this.quizRating === option.value
                  ? 'selected'
                  : ''}"
                aria-label=${option.label}
                @click=${() => this.setQuizRating(option.value)}
              >
                <span class="likert-label">${option.label}</span>
              </button>
            `,
          )}
        </div>
        <div class="quiz-question">
          In one sentence, describe what you like or dislike.
        </div>
        <pr-textarea
          size="small"
          variant="outlined"
          .rows=${6}
          placeholder="Type your answer here..."
          .value=${text}
          ?disabled=${isSubmitting}
          ?focused=${true}
          @change=${this.onQuizTextChange}
          @keydown=${this.onQuizKeydown}
          class="quiz-textarea"
        >
        </pr-textarea>
        <pr-button
          size="small"
          variant="tonal"
          ?disabled=${!canSubmit}
          ?loading=${isSubmitting}
          @click=${() => this.submitQuiz()}
          class="quiz-submit-btn"
        >
          Submit
        </pr-button>
      </div>
    `;
  }

  private onQuizTextChange(e: CustomEvent) {
    this.participantService.setQuizText(e.detail.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-info-panel': ChatPanel;
  }
}
