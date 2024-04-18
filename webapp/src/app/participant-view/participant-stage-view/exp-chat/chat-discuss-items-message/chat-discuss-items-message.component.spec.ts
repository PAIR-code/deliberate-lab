import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message.component';

describe('ChatDiscussItemsMessageComponent', () => {
  let component: ChatDiscussItemsMessageComponent;
  let fixture: ComponentFixture<ChatDiscussItemsMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatDiscussItemsMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatDiscussItemsMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
