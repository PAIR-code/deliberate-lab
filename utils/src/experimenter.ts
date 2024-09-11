/** Experimenter types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //


/** Experimenter profile (written to Firestore under experimenters/{id}). */
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

export function createExperimenterData(
  experimenterId: string
): ExperimenterData {
  return {
    id: experimenterId,
    apiKeys: { geminiKey: '' }
  };
}
