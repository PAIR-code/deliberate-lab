import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediatorChatComponent } from './mediator-chat.component';

describe('MediatorChatComponent', () => {
  let component: MediatorChatComponent;
  let fixture: ComponentFixture<MediatorChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediatorChatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MediatorChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
