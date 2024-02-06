import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateExperimentComponent } from './create-experiment.component';

describe('CreateExperimentComponent', () => {
  let component: CreateExperimentComponent;
  let fixture: ComponentFixture<CreateExperimentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateExperimentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateExperimentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
