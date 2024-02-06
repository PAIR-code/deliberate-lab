import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { experimenterAuthGuard } from './experimenter-auth.guard';

describe('experimenterAuthGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => experimenterAuthGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
