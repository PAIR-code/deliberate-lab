import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatUserProfileComponent } from './chat-user-profile.component';

describe('ChatUserProfileComponent', () => {
  let component: ChatUserProfileComponent;
  let fixture: ComponentFixture<ChatUserProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUserProfileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
