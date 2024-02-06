import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantViewComponent } from './participant-view.component';

describe('ParticipantViewComponent', () => {
  let component: ParticipantViewComponent;
  let fixture: ComponentFixture<ParticipantViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ParticipantViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
