import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpTosAndProfileComponent } from './exp-tos-and-profile.component';

describe('ExpTosAndProfileComponent', () => {
  let component: ExpTosAndProfileComponent;
  let fixture: ComponentFixture<ExpTosAndProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpTosAndProfileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpTosAndProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
