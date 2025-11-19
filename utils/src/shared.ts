import {Timestamp} from 'firebase/firestore';
import {ExperimentDownload} from './data';
import {v4 as uuidv4} from 'uuid';
import {MediatorStatus} from './mediator';
import {ParticipantStatus} from './participant';

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

export interface ParticipantNextStageResponse {
  currentStageId: string | null;
  endExperiment: boolean;
}

export interface ExperimentDownloadResponse {
  data: ExperimentDownload | null;
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

export const r1_apply = 'r1_apply';
export const apply_r1 = 'apply_r1';

export const LR_BASELINE_TASK1_ID = 'baseline1';

export const LR_BASELINE_TASK2_ID = 'baseline2';
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

/** Convert UnifiedTimestamp to (hh:mm) format. */
export function convertUnifiedTimestampToTime(
  timestamp: UnifiedTimestamp,
  includeParentheses = true,
) {
  const date = new Date(timestamp.seconds * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  if (includeParentheses) {
    return `(${time})`;
  }
  return time;
}

/** Await typing delay (e.g., for chat messages). */
export async function awaitTypingDelay(
  message: string,
  wordsPerMinute: number,
): Promise<void> {
  const delay = getTypingDelayInMilliseconds(message, wordsPerMinute);
  console.log(
    `Waiting ${(delay / 1000).toFixed(2)} seconds to simulate delay.`,
  );
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Calculate typing delay (e.g., for chat messages). */
export function getTypingDelayInMilliseconds(
  message: string,
  wordsPerMinute: number,
): number {
  const wordCount = message.split(' ').length;
  const timeInMinutes = wordCount / wordsPerMinute;
  let timeInSeconds = timeInMinutes * 60;

  // Add randomness to simulate variability in typing speed (0.75 - 1.25)
  const randomnessFactor = 0.5;
  const randomMultiplier =
    1 + (Math.random() * randomnessFactor - randomnessFactor / 2);
  timeInSeconds *= randomMultiplier;

  const delay = Math.min(timeInSeconds, 10) * 1000; // Cap delay at 10 seconds.
  return Math.round(delay);
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
  config: Partial<PermissionsConfig> = {},
): PermissionsConfig {
  return {
    visibility: config.visibility ?? Visibility.PRIVATE,
    readers: config.readers ?? [],
  };
}

/**
 * Get display text for agent status (mediator or participant).
 * Converts internal status values to user-friendly display text.
 */
export function getAgentStatusDisplayText(
  status: MediatorStatus | ParticipantStatus,
): string {
  // Mediator statuses are already in display format
  if (status === MediatorStatus.ACTIVE || status === MediatorStatus.PAUSED) {
    return status;
  }

  // Convert participant statuses to display format
  if (status === ParticipantStatus.IN_PROGRESS) {
    return 'active';
  }
  if (status === ParticipantStatus.PAUSED) {
    return 'paused';
  }

  // For other statuses, return as-is
  return status;
}
