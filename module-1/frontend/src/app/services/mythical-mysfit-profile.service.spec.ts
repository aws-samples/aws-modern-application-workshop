import { TestBed, inject } from '@angular/core/testing';

import { MythicalMysfitProfileService } from './mythical-mysfit-profile.service';

describe('MythicalMysfitProfileService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MythicalMysfitProfileService]
    });
  });

  it('should be created', inject([MythicalMysfitProfileService], (service: MythicalMysfitProfileService) => {
    expect(service).toBeTruthy();
  }));
});
