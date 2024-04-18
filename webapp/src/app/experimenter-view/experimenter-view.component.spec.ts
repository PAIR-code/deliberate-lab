import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperimenterViewComponent } from './experimenter-view.component';

describe('ExperimenterViewComponent', () => {
  let component: ExperimenterViewComponent;
  let fixture: ComponentFixture<ExperimenterViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimenterViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExperimenterViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
