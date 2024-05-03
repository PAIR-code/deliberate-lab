/** Register all functions */

// Cloud functions
export * from './endpoints/experiments.endpoints';
export * from './endpoints/messages.endpoints';
export * from './endpoints/participants.endpoints';
export * from './endpoints/templates.endpoints';

// Firestore triggers
export * from './triggers/experiments.triggers';

// All cloud functions are defined in their own files and imported here.
