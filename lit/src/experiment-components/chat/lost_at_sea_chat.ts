import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import '../footer/footer';
import '../mediators/mediator_config';
import '../profile/profile_avatar';
import '../progress/progress_end_chat';
import '../progress/progress_stage_waiting';
import './chat_interface';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {
  ChatKind,
  GroupChatStageConfig,
  ITEMS,
  ItemName,
  PARTICIPANT_COMPLETION_TYPE,
} from '@llm-mediation-experiments/utils';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {core} from '../../core/core';
import {AuthService} from '../../services/auth_service';
import {ChatService} from '../../services/chat_service';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {convertMarkdownToHTML} from '../../shared/utils';

import {createMediator, getChatRatingsToDiscuss} from '../../shared/utils';

import {styles} from './lost_at_sea_chat.scss';

/** Ranking chat stage (discuss different item pairs). */
@customElement('lost-at-sea-chat')
export class RankingChat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: GroupChatStageConfig | null = null;

  @state() value = '';
  @state() mediator = createMediator();
  @state() showMediationPanel = false;

  override render() {
    if (
      this.stage === null ||
      this.stage.chatConfig.kind !== ChatKind.ChatAboutItems
    ) {
      return nothing;
    }

    const currentStage = this.stage.id!;
    const {ready, notReady} =
      this.experimentService.getParticipantsReadyForStage(currentStage);

    const descriptionContent = this.stage.description
      ? html`<div class="description">
          ${unsafeHTML(convertMarkdownToHTML(this.stage.description))}
        </div>`
      : '';
    if (notReady.length > 0) {
      return html`
        ${descriptionContent}
        <progress-stage-waiting .stageId=${currentStage}>
        </progress-stage-waiting>
      `;
    }
    const hasChatEnded =
      this.stage.chatConfig.ratingsToDiscuss.length <=
      this.chatService.getCurrentRatingIndex();

    const numDiscussions = getChatRatingsToDiscuss(this.stage!).length;
    const showNext = this.chatService.getCurrentRatingIndex() >= numDiscussions;

    return html`
      ${descriptionContent}
      <div class="chat-interface-wrapper">
        <div class="panel">
          ${this.renderParticipants()} ${this.renderTask()}
          ${this.renderEndDiscussion()} ${this.renderMediationButton()}
        </div>
        ${this.renderMediationPanel()}
        <chat-interface .disableInput=${hasChatEnded}></chat-interface>
      </div>
      <stage-footer .disabled=${!showNext}> </stage-footer>
    `;
  }

  private renderParticipants() {
    return html`
      <div class="panel-item">
        <div class="panel-item-title">Participants</div>
        ${this.experimentService.getParticipantProfiles().map(
          (p) =>
            html`
              <div class="profile">
                <profile-avatar
                  .emoji=${p.avatarUrl}
                  .disabled=${p.completedExperiment &&
                  p.completionType! !== PARTICIPANT_COMPLETION_TYPE.SUCCESS}
                ></profile-avatar>
                <div>${p.name} (${p.pronouns})</div>
              </div>
            `
        )}
      </div>
    `;
  }

  private getLabel() {
    const rating = this.chatService.getCurrentRatingIndex() + 1;
    const numDiscussions = getChatRatingsToDiscuss(this.stage!).length;

    if (rating < numDiscussions) {
      return `Discussion ${rating} of ${numDiscussions}`;
    } else {
      return `Discussion ${numDiscussions} of ${numDiscussions}`;
    }
  }

  private renderItem(item: ItemName) {
    return html`
      <div class="item">
        <div class="img-wrapper">
          <img src=${ITEMS[item].imageUrl} />
        </div>
        ${ITEMS[item].name}
      </div>
    `;
  }

  private renderTask() {
    const index = this.chatService.getCurrentRatingIndex();
    const ratings = getChatRatingsToDiscuss(this.stage!);
    const length = getChatRatingsToDiscuss(this.stage!).length;
    const pair = ratings[Math.min(index, ratings.length - 1)];

    if (index >= length) {
      return html`
        <div class="panel-item">
          <div class="panel-item-title">Discussions</div>
          <div>${length} of ${length} discussions completed.</div>
        </div>
      `;
    }

    return html`
      <div class="panel-item">
        <div class="panel-item-title">${this.getLabel()}</div>
        <div class="pair">
          ${pair ? this.renderItem(pair!.item1) : nothing}
          ${pair ? this.renderItem(pair!.item2) : nothing}
        </div>
      </div>
    `;
  }

  private renderEndDiscussion() {
    const index = this.chatService.getCurrentRatingIndex();
    const length = getChatRatingsToDiscuss(this.stage!).length;
    const readyToEnd = this.experimentService.getParticipantReadyToEndChat(
      this.stage!.id,
      this.participantService.profile!.publicId
    );

    return html`
      <div class="panel-item">
        <pr-button
          color="tertiary"
          variant="tonal"
          ?disabled=${readyToEnd || index >= length}
          @click=${() => {
            this.chatService.markReadyToEndChat(true);
          }}
        >
          Ready to end discussion
        </pr-button>
        <div>
          You can still participate in the chat. When everyone is ready to end
          the discussion, the conversation will progress to the next stage.
        </div>
        <progress-end-chat .stageId=${this.stage!.id}></progress-end-chat>
      </div>
    `;
  }

  private renderMediationButton() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const onClick = () => {
      this.showMediationPanel = !this.showMediationPanel;
    };

    return html`
      <div class="panel-item">
        <div class="panel-item-title">Mediation</div>
        <pr-button variant="tonal" @click=${onClick}>
          ${this.showMediationPanel ? 'Hide' : 'Show'} mediation panel
        </pr-button>
        <div>This option is visible only to experimenters!</div>
      </div>
    `;
  }

  private renderMediationPanel() {
    if (!this.authService.isExperimenter || !this.showMediationPanel) {
      return nothing;
    }

    const onSendLLMMessage = () => {
      this.chatService.sendLLMMediatorMessage(this.mediator);
    };

    return html`
      <div class="mediation-panel-wrapper">
        <div class="mediation-panel">
          <mediator-config .mediator=${this.mediator} .showKind=${false}>
          </mediator-config>
          <pr-button @click=${onSendLLMMessage}>
            Send LLM-generated message
          </pr-button>
        </div>
        ${this.renderMediationInput()}
      </div>
    `;
  }

  private renderMediationInput() {
    const sendUserInput = () => {
      this.chatService.sendMediatorMessage(
        this.value,
        this.mediator.name,
        this.mediator.avatar
      );
      this.value = '';
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        sendUserInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      this.value = (e.target as HTMLTextAreaElement).value;
    };

    return html`
      <div class="mediation-input">
        <pr-textarea
          size="small"
          placeholder="Send message"
          .value=${this.value}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send mediator message"
          color="secondary"
          variant="outlined"
          position="TOP_RIGHT"
        >
          <pr-icon-button
            icon="send"
            color="secondary"
            variant="tonal"
            @click=${sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lost-at-sea-chat': RankingChat;
  }
}
