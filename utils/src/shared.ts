import type { Timestamp } from 'firebase/firestore';

/** Shared types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  id: string;
}

// Helper for Timestamp (make it work between admin & sdk).
//
// Packages firebase-admin/firestore and firebase/firestore use
// different Timestamp types. This type is a workaround to handle both types
// in the same codebase.
// When creating a new Timestamp, use the Timestamp class from the correct
// package (its type is compatible with this type)
export type UnifiedTimestamp = Omit<Timestamp, 'toJSON'>;

/** Metadata for experiments and templates. */
export interface MetadataConfig {
  name: string;
  publicName: string;
  description: string;
  tags: string[];
  creator: string; // experimenter ID
  starred: Record<string, boolean>; // maps from experimenter ID to isStarred
  dateCreated: UnifiedTimestamp;
  dateEdited: UnifiedTimestamp;
}

/** Permissions config for templates. **/
export interface PermissionsConfig {
  visibility: Visibility;
  readers: string[]; // list of experimenter IDs
}

export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function generateId(): string {
  return crypto.randomUUID();
}