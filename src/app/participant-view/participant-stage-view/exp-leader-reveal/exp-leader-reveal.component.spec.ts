import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpLeaderRevealComponent } from './exp-leader-reveal.component';

describe('ExpLeaderRevealComponent', () => {
  let component: ExpLeaderRevealComponent;
  let fixture: ComponentFixture<ExpLeaderRevealComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpLeaderRevealComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpLeaderRevealComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
