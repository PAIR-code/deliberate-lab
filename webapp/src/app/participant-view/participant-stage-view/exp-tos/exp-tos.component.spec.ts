import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpTosComponent } from './exp-tos.component';

describe('ExpTosComponent', () => {
  let component: ExpTosComponent;
  let fixture: ComponentFixture<ExpTosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpTosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpTosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
