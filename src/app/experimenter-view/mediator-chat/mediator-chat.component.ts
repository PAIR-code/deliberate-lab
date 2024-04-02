import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import {
  ChatAboutItems,
  ExpStageChatAboutItems,
  Item,
  ItemPair,
  Message,
  UserData,
  fakeChat,
} from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { ChatUserMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from '../../participant-view/participant-stage-view/exp-chat/mediator-feedback/mediator-feedback.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { sendMediatorGroupMessage, sendMediatorGroupRatingToDiscuss } from 'src/lib/staged-exp/app';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { preparePalm2Request, sendPalm2Request } from 'src/lib/text-templates/llm_vertexapi_palm2';
import { VertexApiService } from 'src/app/services/vertex-api.service';
import { FewShotTemplate } from 'src/lib/text-templates/fewshot_template';
import { nv, template } from 'src/lib/text-templates/template';

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
export class MediatorChatComponent {
  roomName: WritableSignal<string> = signal('');

  @Input() experiment?: Signal<string>;
  @Input() participants?: Signal<UserData[]>;

  @Input()
  set chatRoomName(name: string) {
    this.roomName.set(name);
  }

  public messages: Signal<Message[]>;
  public message: string = '';

  public items: Signal<Item[]>;
  public itemPair: Signal<ItemPair>;
  public instructions: string = '';

  public defaultPrefix: string = 'You are a mediator assistant guiding a conversation whose goal is to discuss and decide the best item to survive a sinking yacht lost in the South Pacific.'
  public defaultSuffix: string = 'What is the best message to send to the chat participants at this stage of the discussion to keep it constructive, unbiased, and civil? Just write the message without the username. Do not use quotes.';
  public prefix: string = this.defaultPrefix;
  public suffix: string = this.defaultSuffix;


  constructor(private appStateService: AppStateService, private llmService: VertexApiService) {
    this.messages = computed(() => {
      if (this.roomName() === '' || !this.experiment || !this.participants) {
        return [];
      }
      // TODO: think about how to show a merged view in cases when
      // partcipants have different views...
      const participant0 = this.participants()[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.messages;
    });

    this.items = computed(() => {
      if (this.roomName() === '' || !this.experiment || !this.participants) {
        return [];
      }
      const participant0 = this.participants()[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.items;
    });

    this.itemPair = computed(() => {
      return {item1: this.items()[0], item2: this.items()[1]};
    });

  }

  sendMessage() {
    if (!this.experiment) {
      throw new Error('Tried to send a message without knowing the experiment');
    }
    sendMediatorGroupMessage(this.appStateService.data, this.experiment(), {
      stageName: this.roomName(),
      message: this.message,
    });
    this.message = '';
  }

  updateItemPair(updatedValue: MatSelectChange, i: number) {
    if (i === 1) {
      this.itemPair().item1 = updatedValue.value;
    } else if (i === 2) {
      this.itemPair().item2 = updatedValue.value;
    }
    else {
      throw new Error('Only two items in one pair of item');
    }
  }

  sendRatingToDiscuss() {
    if (!this.experiment) {
      throw new Error('Tried to send a RatingToDiscuss without knowing the experiment');
    }
    sendMediatorGroupRatingToDiscuss(this.appStateService.data, this.experiment(), {
      stageName: this.roomName(),
      itemPair: this.itemPair(),
      message: this.instructions,
    });
  }

  async sendLLMMessage() {
    //const prompt = `Hello word`;
    // TODO Add messages to the prompt
    const nPropertyValuePerLineTempl = new FewShotTemplate(template
      `${nv('property')}: "${nv('value')}"`,
      '\n');
    const userAndMessageList = [
      { 
        property: 'Username',
        value: nv('username'),
      },
      { 
        property: 'Message',
        value: nv('message'),
      }
    ];
    const userMessageTempl = nPropertyValuePerLineTempl.apply(userAndMessageList);
    // expect(userMessageTempl.escaped).toEqual(
    //   `Username: "{{username}}"
    //    Message: "{{message}}"`);

    const nMediationExamplesTempl = new FewShotTemplate(
      userMessageTempl, '\n\n');

    const mediationTempl = template
      `${this.prefix}
      
${nv('conversation')}
      
${this.suffix}`;

    // Create empty list in conversation
    const conversation: { username: string; message: string; }[] = [];
    // Add messages from this.messages() to the conversation
    this.messages().forEach((m) => {
      if (m.messageType === 'userMessage') {
        conversation.push({
          username: m.fromProfile.name,
          message: m.text,
        });
      }
      else if (m.messageType === 'discussItemsMessage') {
        conversation.push({
          username: 'Mediator',
          message: m.text,
        });
      }
      else if (m.messageType === 'mediatorMessage') {
        conversation.push({
          username: 'Mediator',
          message: m.text,
        });
      }
    });

    const mediationWithMessages = mediationTempl.substs({
      conversation: nMediationExamplesTempl.apply(conversation).escaped
    });

    const prompt = mediationWithMessages.escaped;

    console.log(prompt);
    const request = preparePalm2Request(prompt);
    const response = await sendPalm2Request(
      this.llmService.projectId, this.llmService.accessToken, request);
    // console.log(JSON.stringify(response));
    // console.log(response.predictions[0].content);
    // Send message to chat
    this.message = response.predictions[0].content;
    this.sendMessage();
  };

}
