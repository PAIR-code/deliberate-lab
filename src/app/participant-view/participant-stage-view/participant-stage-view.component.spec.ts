import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantStageViewComponent } from './participant-stage-view.component';

describe('ParticipantStageViewComponent', () => {
  let component: ParticipantStageViewComponent;
  let fixture: ComponentFixture<ParticipantStageViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantStageViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ParticipantStageViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
