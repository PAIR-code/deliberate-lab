import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LlmApiConfigComponent } from './llm-api-config.component';

describe('LlmApiConfigComponent', () => {
  let component: LlmApiConfigComponent;
  let fixture: ComponentFixture<LlmApiConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LlmApiConfigComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LlmApiConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
