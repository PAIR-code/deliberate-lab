import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  GroupChatStageConfig,
  MessageKind,
  ParticipantProfileExtended,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import { AppStateService } from 'src/app/services/app-state.service';
import { VertexApiService } from 'src/app/services/vertex-api.service';
import { ChatRepository } from 'src/lib/repositories/chat.repository';
import { FewShotTemplate } from 'src/lib/text-templates/fewshot_template';
import { preparePalm2Request, sendPalm2Request } from 'src/lib/text-templates/llm_vertexapi_palm2';
import { nv, template } from 'src/lib/text-templates/template';
import { ChatDiscussItemsMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-mediator-message/chat-mediator-message.component';
import { ChatUserMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-user-message/chat-user-message.component';
import { MediatorFeedbackComponent } from '../../participant-view/participant-stage-view/exp-chat/mediator-feedback/mediator-feedback.component';

@Component({
  selector: 'app-mediator-chat',
  standalone: true,
  imports: [
    ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './mediator-chat.component.html',
  styleUrl: './mediator-chat.component.scss',
})
export class MediatorChatComponent {
  @Input() participants!: Signal<ParticipantProfileExtended[]>;
  @Input() experimentId!: Signal<string | undefined>;

  @Input()
  set chatValue(value: GroupChatStageConfig | undefined) {
    this.chatConfig.set(value);
  }

  public chatConfig: WritableSignal<GroupChatStageConfig | undefined> = signal(undefined);
  public viewingParticipantId: WritableSignal<string | undefined> = signal(undefined); // TODO: make it possible in the UI to select a participant whose chat to view
  public chatRepository: Signal<ChatRepository | undefined> = signal(undefined);

  // Message mutation & form
  public message = new FormControl<string>('', Validators.required);

  public defaultPrefix: string =
    'You are a mediator assistant guiding a conversation whose goal is to discuss and decide the best item to survive a sinking yacht lost in the South Pacific.';
  public defaultSuffix: string =
    'What is the best message to send to the chat participants at this stage of the discussion to keep it constructive, unbiased, and civil? Just write the message without the username. Do not use quotes.';
  public prefix: string = this.defaultPrefix;
  public suffix: string = this.defaultSuffix;

  constructor(
    private llmService: VertexApiService,
    appState: AppStateService,
  ) {
    // Dynamically get the chat repository
    this.chatRepository = computed(() => {
      const participantId = this.viewingParticipantId();
      const chatId = this.chatConfig()?.chatId;
      const experimentId = this.experimentId();

      if (!participantId || !chatId || !experimentId) return undefined;

      return appState.chats.get({
        experimentId,
        participantId,
        chatId,
      });
    });
  }

  sendMessage() {
    if (!this.message.valid || !this.message.value) return;

    this.chatRepository()?.sendMediatorMessage(this.message.value);
    this.message.setValue('');
  }

  async sendLLMMessage() {
    //const prompt = `Hello word`;
    // TODO Add messages to the prompt
    const nPropertyValuePerLineTempl = new FewShotTemplate(
      template`${nv('property')}: "${nv('value')}"`,
      '\n',
    );
    const userAndMessageList = [
      {
        property: 'Username',
        value: nv('username'),
      },
      {
        property: 'Message',
        value: nv('message'),
      },
    ];
    const userMessageTempl = nPropertyValuePerLineTempl.apply(userAndMessageList);
    // expect(userMessageTempl.escaped).toEqual(
    //   `Username: "{{username}}"
    //    Message: "{{message}}"`);

    const nMediationExamplesTempl = new FewShotTemplate(userMessageTempl, '\n\n');

    const mediationTempl = template`${this.prefix}

${nv('conversation')}

${this.suffix}`;

    // Create empty list in conversation
    const participantsLookup = lookupTable(this.participants(), 'publicId');
    const conversation: { username: string; message: string }[] =
      this.chatRepository()
        ?.messages()
        .map((m) => ({
          message: m.text,
          username:
            m.kind === MessageKind.UserMessage
              ? participantsLookup[m.fromPublicParticipantId].name ?? 'User'
              : 'Mediator',
        })) ?? [];

    const mediationWithMessages = mediationTempl.substs({
      conversation: nMediationExamplesTempl.apply(conversation).escaped,
    });

    const prompt = mediationWithMessages.escaped;

    console.log(prompt);
    const request = preparePalm2Request(prompt);
    const response = await sendPalm2Request(
      this.llmService.projectId,
      this.llmService.accessToken,
      request,
    );
    // console.log(JSON.stringify(response));
    // console.log(response.predictions[0].content);
    // Send message to chat
    this.message.setValue(response.predictions[0].content);
    this.sendMessage();
  }
}
