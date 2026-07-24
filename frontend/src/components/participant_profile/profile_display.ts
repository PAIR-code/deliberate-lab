import '../../pair-components/tooltip';
import './avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  ParticipantProfile,
  ParticipantProfileBase,
  getParticipantStageProfile,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {CohortService} from '../../services/cohort.service';

import {styles} from './profile_display.scss';
import {
  getHashBasedColor,
  MEDIATOR_OBSERVER_COLOR,
  variableAssignmentsIncludeObserver,
} from '../../shared/utils';
import {MAN_EMOJIS, WOMAN_EMOJIS, PERSON_EMOJIS} from '../../shared/constants';

enum ProfileDisplayType {
  // horizontal with small circle avatar + name (no pronouns)
  // (experimenter dashboard, header)
  DEFAULT = 'default',
  // horizontal with big circle avatar + name + pronouns
  // (chat panel)
  CHAT = 'chat',
  // horizontal with small circle avatar + name + pronouns
  // (small chat panel)
  CHAT_SMALL = 'chatSmall',
  // horizontal with big square avatar + name + pronouns
  // (ranking, per-participant survey stages)
  STAGE = 'stage',
  // vertical with big circle avatar + name + pronouns
  // (waiting screens)
  WAITING = 'waiting',
  // avatar with name in tooltip
  // (stage progress bars)
  PROGRESS = 'progress',
  // NOTE: For inline string with avatar and name,
  // use getParticipantInlineDisplay in shared/participant.utils
}

/** Participant profile name/avatar/pronouns display */
@customElement('participant-profile-display')
export class ParticipantProfileDisplay extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  @property() stageId = '';
  @property() stageName = '';
  @property() profile: ParticipantProfile | undefined = undefined;
  @property() displayType: ProfileDisplayType = ProfileDisplayType.DEFAULT;

  // Disable profile
  @property() isDisabled = false;

  // Display (you) indicator that the profile is the current user
  @property() showIsSelf = false;

  // Avatar colors to exclude from id/hash-based selection (e.g. blue when it
  // is reserved for mediators).
  @property({type: Array}) excludeColors: string[] = [];

  private readonly cohortService = core.getService(CohortService);

  // In an observer study the mediator color is reserved, so participants must
  // not derive it. Callers can still pass their own exclusions.
  private get effectiveExcludeColors(): string[] {
    if (this.excludeColors.length > 0) return this.excludeColors;
    return variableAssignmentsIncludeObserver(
      this.cohortService.activeParticipants,
    )
      ? [MEDIATOR_OBSERVER_COLOR]
      : [];
  }

  override render() {
    if (!this.profile) return nothing;

    const nameFallback =
      this.displayType === ProfileDisplayType.DEFAULT ||
      this.displayType === ProfileDisplayType.CHAT
        ? this.profile.publicId
        : '';

    // Use profile ID to determine color
    const color = () => {
      // If publicId is in format animal-color-number, extract color (unless it
      // is excluded, e.g. blue reserved for mediators)
      const excludeColors = this.effectiveExcludeColors;
      const splitId = (this.profile?.publicId ?? '').split('-');
      if (splitId.length >= 3 && !excludeColors.includes(splitId[1])) {
        return splitId[1];
      }
      // Otherwise, use publicId as hash
      return getHashBasedColor(this.profile?.publicId, excludeColors);
    };

    const resolvedStage = this.stageId
      ? this.experimentService.getStage(this.stageId)
      : undefined;
    const resolvedStageName = this.stageName || (resolvedStage?.name ?? '');
    const baseProfile: ParticipantProfileBase = getParticipantStageProfile(
      this.profile,
      this.stageId,
      resolvedStageName,
      resolvedStage?.anonymousProfileSetId,
    );

    return html`
      <profile-display
        .profile=${baseProfile}
        .displayType=${this.displayType}
        .isDisabled=${this.isDisabled}
        .nameFallback=${nameFallback}
        .color=${color()}
        .showIsSelf=${this.showIsSelf}
      >
      </profile-display>
    `;
  }
}

/** Profile name/avatar/pronouns display */
@customElement('profile-display')
export class ProfileDisplay extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() profile: ParticipantProfileBase | undefined = undefined;
  @property() displayType: ProfileDisplayType = ProfileDisplayType.DEFAULT;
  @property() color = '';

  // Fallback if name is empty
  @property() nameFallback = '';

  // Disable profile
  @property() isDisabled = false;

  // Display (you) indicator that the profile is the current user
  @property() showIsSelf = false;

  override render() {
    if (!this.profile) return nothing;

    // Pass color into avatar-icon
    const getColor = () => {
      const avatar = this.profile?.avatar;
      if (!avatar) {
        return ''; // empty avatar
      }

      if (MAN_EMOJIS.indexOf(avatar) > -1) {
        return 'blue';
      } else if (WOMAN_EMOJIS.indexOf(avatar) > -1) {
        return 'pink';
      } else if (PERSON_EMOJIS.indexOf(avatar) > -1) {
        return 'purple';
      } else {
        return this.color;
      }
    };

    const getName = () => {
      if (this.profile?.name === '') {
        return this.nameFallback;
      }
      return this.profile?.name ?? this.nameFallback;
    };

    const renderName = () => {
      const name = getName();
      if (name.length > 20) {
        return html`
          <pr-tooltip text=${name} position="TOP_START">
            <div class="display-name truncated">${name}</div>
          </pr-tooltip>
        `;
      }
      return html`<div class="display-name">${name}</div>`;
    };

    const renderPronouns = () => {
      if (this.profile?.pronouns) {
        return html`<div class="pronouns">(${this.profile.pronouns})</div>`;
      }
      return nothing;
    };

    if (this.displayType === ProfileDisplayType.DEFAULT) {
      return html`
        <div class="horizontal-profile small">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .isDisabled=${this.isDisabled}
            .color=${getColor()}
            .small=${true}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${renderName()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (
      this.displayType === ProfileDisplayType.CHAT ||
      this.displayType === ProfileDisplayType.CHAT_SMALL
    ) {
      const isSmall = this.displayType === ProfileDisplayType.CHAT_SMALL;
      return html`
        <div class="horizontal-profile ${isSmall ? 'small' : ''}">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .color=${getColor()}
            .isDisabled=${this.isDisabled}
            .small=${isSmall}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${getName()} ${renderPronouns()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (this.displayType === ProfileDisplayType.WAITING) {
      // TODO: Truncate names if too long?
      return html`
        <div class="waiting-profile">
          <avatar-icon
            .emoji=${this.profile.avatar}
            .color=${getColor()}
            .isDisabled=${this.isDisabled}
          >
          </avatar-icon>
          <div class="display-name-wrapper">
            ${getName()} ${renderPronouns()}
            ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
          </div>
        </div>
      `;
    }

    if (this.displayType === ProfileDisplayType.PROGRESS) {
      const tooltip = `${getName()}${this.showIsSelf ? ' (you)' : ''}`;
      return html`
        <avatar-icon
          .small=${true}
          .color=${getColor()}
          .emoji=${this.profile.avatar}
          .tooltip=${tooltip}
        >
        </avatar-icon>
      `;
    }

    return html`
      <div class="horizontal-profile">
        <avatar-icon
          .emoji=${this.profile.avatar}
          .isDisabled=${this.isDisabled}
          .color=${getColor()}
          .square=${this.displayType === ProfileDisplayType.STAGE}
        >
        </avatar-icon>
        <div class="display-name-wrapper">
          ${renderName()} ${renderPronouns()}
          ${this.showIsSelf ? html`<div>(you)</div>` : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-profile-display': ParticipantProfileDisplay;
    'profile-display': ProfileDisplay;
  }
}
