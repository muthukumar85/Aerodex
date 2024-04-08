import { TestBed } from '@angular/core/testing';

import { TokenomicsService } from './tokenomics.service';

describe('TokenomicsService', () => {
  let service: TokenomicsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenomicsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
