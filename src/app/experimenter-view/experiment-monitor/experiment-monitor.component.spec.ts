import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimentMonitorComponent } from './experiment-monitor.component';

describe('ExperimentMonitorComponent', () => {
  let component: ExperimentMonitorComponent;
  let fixture: ComponentFixture<ExperimentMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentMonitorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperimentMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
