import { Component, Input, OnDestroy, Signal, WritableSignal, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Unsubscribe } from 'firebase/firestore';
import { VertexApiService } from 'src/app/services/vertex-api.service';
import { FewShotTemplate } from 'src/lib/text-templates/fewshot_template';
import { preparePalm2Request, sendPalm2Request } from 'src/lib/text-templates/llm_vertexapi_palm2';
import { nv, template } from 'src/lib/text-templates/template';
import { ChatAboutItems } from 'src/lib/types/chats.types';
import { Message } from 'src/lib/types/messages.types';
import { ParticipantExtended } from 'src/lib/types/participants.types';
import { chatMessagesSubscription } from 'src/lib/utils/firestore.utils';
import { extendUntilMatch } from 'src/lib/utils/object.utils';
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
  ],
  templateUrl: './mediator-chat.component.html',
  styleUrl: './mediator-chat.component.scss',
})
export class MediatorChatComponent implements OnDestroy {
  @Input() experiment?: Signal<string | null>;
  @Input() participants?: Signal<ParticipantExtended[]>;

  @Input()
  set chatValue(value: ChatAboutItems | undefined) {
    this.chat.set(value);
  }

  public chat: WritableSignal<ChatAboutItems | undefined> = signal(undefined);

  public messages: WritableSignal<Message[]>;
  public unsubscribeMessages: Unsubscribe | undefined;

  public message: string = '';

  public defaultPrefix: string =
    'You are a mediator assistant guiding a conversation whose goal is to discuss and decide the best item to survive a sinking yacht lost in the South Pacific.';
  public defaultSuffix: string =
    'What is the best message to send to the chat participants at this stage of the discussion to keep it constructive, unbiased, and civil? Just write the message without the username. Do not use quotes.';
  public prefix: string = this.defaultPrefix;
  public suffix: string = this.defaultSuffix;

  constructor(private llmService: VertexApiService) {
    // Firestore subscription for messages, dynamically changes based on the input chat id
    this.messages = signal([]);
    effect(() => {
      const id = this.chat()?.chatId;

      this.unsubscribeMessages?.();

      if (id !== undefined) {
        this.unsubscribeMessages = chatMessagesSubscription(id, (m) => {
          this.messages.set(extendUntilMatch(this.messages(), m.reverse(), 'uid'));
        });
      }
    });
  }

  sendMessage() {
    const experiment = this.experiment?.();
    if (!experiment) {
      throw new Error('Tried to send a message without knowing the experiment');
    }
    // TODO: use the new backend
    // sendMediatorGroupMessage(this.appStateService.data, experiment, {
    //   stageName: this.roomName(),
    //   message: this.message,
    // });
    // TODO: use a reactive form, as done with the users
    this.message = '';
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
    const conversation: { username: string; message: string }[] = this.messages().map((m) => ({
      message: m.text,
      // TODO: add an experiment provider at the experimenter base.
      username: m.messageType === 'userMessage' ? 'User' : 'Mediator', // TODO: display user profile
    }));

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
    this.message = response.predictions[0].content;
    this.sendMessage();
  }

  ngOnDestroy() {
    this.unsubscribeMessages?.();
  }
}
