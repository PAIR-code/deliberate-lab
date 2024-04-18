import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { validParticipantGuard } from './valid-participant.guard';

describe('validParticipantGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => validParticipantGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
