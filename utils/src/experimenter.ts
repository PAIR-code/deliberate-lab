/** Experimenter types and functions. */

import {Timestamp} from 'firebase/firestore';
import {UnifiedTimestamp} from './shared';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //


/** Experimenter allowlist profile. */
export interface Experimenter {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

/** Experimenter public profile (written to Firestore under experimenters/{id}). */
export interface ExperimenterProfile {
  id: string;
  name: string;
  email: string;
}

/** Experimenter data (written to Firestore under experimenterData/{id}). */
export interface ExperimenterData {
  id: string;
  apiKeys: APIKeyConfig;
}

export interface APIKeyConfig {
  geminiKey: string;
}


// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function getFullExperimenterConfig(
  experimenter: Partial<Experimenter> = {},
): Experimenter {
  return {
    id: experimenter.id ?? '',
    name: experimenter.name ?? '',
    email: experimenter.email ?? '',
    isAdmin: experimenter.isAdmin ?? false
  };
}

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    apiKeys: { geminiKey: '' }
  };
}
