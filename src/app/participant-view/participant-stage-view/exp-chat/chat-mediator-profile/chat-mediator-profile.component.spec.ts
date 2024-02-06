import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatMediatorProfileComponent } from './chat-mediator-profile.component';

describe('ChatMediatorProfileComponent', () => {
  let component: ChatMediatorProfileComponent;
  let fixture: ComponentFixture<ChatMediatorProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMediatorProfileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatMediatorProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
