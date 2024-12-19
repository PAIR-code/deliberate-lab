/** Experimenter types and functions. */

import {Timestamp} from 'firebase/firestore';
import {UnifiedTimestamp} from './shared';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //


/** Experimenter public profile (written to Firestore under experimenters/{id}). */
export interface ExperimenterProfile {
  name: string;
  email: string;
  lastLogin: UnifiedTimestamp|null; // null if never logged in
}

/** Full experimenter profile built from allowlist and experimenter data. */
export interface ExperimenterProfileExtended extends ExperimenterProfile {
  id: string;
  isAdmin: boolean;
}

/** Experimenter data (written to Firestore under experimenterData/{id}). */
export interface ExperimenterData {
  id: string;
  email: string;
  apiKeys: APIKeyConfig;
}

export interface APIKeyConfig {
  geminiKey: string;
}


// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function getFullExperimenterConfig(
  experimenter: Partial<ExperimenterProfileExtended> = {},
): ExperimenterProfileExtended {
  return {
    id: experimenter.id ?? '',
    name: experimenter.name ?? '',
    email: experimenter.email ?? '',
    isAdmin: experimenter.isAdmin ?? false,
    lastLogin: experimenter.lastLogin ?? null
  };
}

export function createExperimenterData(
  experimenterId: string,
  experimenterEmail: string
): ExperimenterData {
  return {
    id: experimenterId,
    email: experimenterEmail,
    apiKeys: { geminiKey: '' }
  };
}
