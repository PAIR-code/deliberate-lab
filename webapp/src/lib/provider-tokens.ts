import { InjectionToken, Signal } from '@angular/core';
import { ExperimentExtended } from '@llm-mediation-experiments/utils';
import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from './participant';

export const PARTICIPANT_PROVIDER_TOKEN = new InjectionToken<ProviderService<Participant>>(
  'ParticipantProvider',
);

export const EXPERIMENT_PROVIDER_TOKEN = new InjectionToken<
  ProviderService<Signal<ExperimentExtended | undefined>>
>('ExperimentExtendedProvider');

// Helper types
export type ParticipantProvider = ProviderService<Participant>;

export type ExperimentProvider = ProviderService<Signal<ExperimentExtended | undefined>>;
