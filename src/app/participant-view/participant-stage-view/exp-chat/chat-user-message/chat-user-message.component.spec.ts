import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatUserMessageComponent } from './chat-user-message.component';

describe('ChatUserMessageComponent', () => {
  let component: ChatUserMessageComponent;
  let fixture: ComponentFixture<ChatUserMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUserMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatUserMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
