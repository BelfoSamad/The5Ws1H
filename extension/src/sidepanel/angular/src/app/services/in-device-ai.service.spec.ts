import { TestBed } from '@angular/core/testing';

import { InDeviceAiService } from './in-device-ai.service';

describe('InDeviceAiService', () => {
  let service: InDeviceAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InDeviceAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
