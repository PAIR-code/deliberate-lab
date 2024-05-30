import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomScrollListComponent } from './bottom-scroll-list.component';
import { Message } from '@llm-mediation-experiments/utils';

describe('BottomScrollListComponent', () => {
  let component: BottomScrollListComponent<Message>;
  let fixture: ComponentFixture<BottomScrollListComponent<Message>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomScrollListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomScrollListComponent<Message>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
