import { TestBed } from '@angular/core/testing';

import { ProviderService } from './provider.service';

describe('ProviderService', <T>() => {
  let service: ProviderService<T>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProviderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
