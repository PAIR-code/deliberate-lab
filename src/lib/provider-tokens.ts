import { InjectionToken } from '@angular/core';
import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from './participant';

export const PARTICIPANT_PROVIDER_TOKEN = new InjectionToken<ProviderService<Participant>>(
  'ParticipantProvider',
);
