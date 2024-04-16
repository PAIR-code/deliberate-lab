import { InjectionToken, Signal } from '@angular/core';
import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from './participant';
import { ExperimentExtended } from './types/experiments.types';

export const PARTICIPANT_PROVIDER_TOKEN = new InjectionToken<ProviderService<Participant>>(
  'ParticipantProvider',
);

export const EXPERIMENT_PROVIDER_TOKEN = new InjectionToken<
  ProviderService<Signal<ExperimentExtended | undefined>>
>('ExperimentExtendedProvider');

// Helper types
export type ParticipantProvider = ProviderService<Participant>;

export type ExperimentProvider = ProviderService<Signal<ExperimentExtended | undefined>>;
