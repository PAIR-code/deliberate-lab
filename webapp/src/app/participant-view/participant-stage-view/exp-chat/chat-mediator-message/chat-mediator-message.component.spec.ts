import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatMediatorMessageComponent } from './chat-mediator-message.component';

describe('ChatMediatorMessageComponent', () => {
  let component: ChatMediatorMessageComponent;
  let fixture: ComponentFixture<ChatMediatorMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMediatorMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatMediatorMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
