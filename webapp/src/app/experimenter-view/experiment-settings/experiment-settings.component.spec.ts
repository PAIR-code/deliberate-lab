import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentSettingsComponent } from './experiment-settings.component';

describe('ExperimentSettingsComponent', () => {
  let component: ExperimentSettingsComponent;
  let fixture: ComponentFixture<ExperimentSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExperimentSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
