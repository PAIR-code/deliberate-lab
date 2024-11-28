import { Timestamp } from 'firebase/firestore';
import { ExperimentDownload } from './data';
import {v4 as uuidv4} from 'uuid';

/** Shared types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface SuccessResponse {
  success: boolean;
}

export interface CreationResponse {
  id: string;
}

export interface ExperimentDownloadResponse {
  data: ExperimentDownload|null;
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
  dateModified: UnifiedTimestamp;
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
// CONSTANTS                                                                 //
// ************************************************************************* //

/** Hardcoded willingness to lead stage ID for Lost at Sea game
  * (needed for determining winner of participant rankings)
  */
export const LAS_WTL_STAGE_ID = 'wtl';

/** Hardcoded willingness to lead question ID for Lost at Sea game
  * (needed for determining winner of participant rankings)
  */
export const LAS_WTL_QUESTION_ID = 'wtl';

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function generateId(isSequential: boolean = false): string {
  // If isSequential is selected, the ID will be lower in the alphanumeric
  // scale as time progresses. This helps to ensure that IDs created at a later time
  // will be sorted later.
  if (isSequential) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomPart}`;
  }
  
  return uuidv4();
}

/** Await typing delay (e.g., for chat messages). */
export async function awaitTypingDelay(message: string): Promise<void> {
  const delay = Math.min(getTypingDelay(message), 30 * 1000); // Cap delay at 30 seconds.
  console.log(`Waiting ${(delay / 1000).toFixed(2)} seconds to simulate delay.`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Calculate typing delay (e.g., for chat messages). */
export function getTypingDelay(message: string): number {
  // 40 WPM = 300 ms per character.
  const averageTypingSpeed = 75; // 180 WPM.
  const randomnessFactor = 0.5;

  const baseDelay = message.length * averageTypingSpeed;
  const randomMultiplier = 1 + (Math.random() * randomnessFactor - randomnessFactor / 2);

  return Math.round(baseDelay * randomMultiplier);
}

/** Create MetadataConfig. */
export function createMetadataConfig(
  config: Partial<MetadataConfig> = {},
): MetadataConfig {
  const timestamp = Timestamp.now();

  return {
    name: config.name ?? '',
    publicName: config.publicName ?? '',
    description: config.description ?? '',
    tags: config.tags ?? [],
    creator: config.creator ?? '',
    starred: config.starred ?? {},
    dateCreated: config.dateCreated ?? timestamp,
    dateModified: config.dateModified ?? timestamp,
  };
}

/** Create PermissionsConfig. */
export function createPermissionsConfig(
  config: Partial<PermissionsConfig> = {}
): PermissionsConfig {
  return {
    visibility: config.visibility ?? Visibility.PRIVATE,
    readers: config.readers ?? [],
  };
}