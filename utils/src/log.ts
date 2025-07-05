import {ModelResponse, ModelResponseStatus} from './model_response';
import {UserProfile} from './participant';
import {UnifiedTimestamp, generateId} from './shared';
import {Timestamp} from 'firebase/firestore';

/** Define experiment log. */
export type LogEntry = ModelLogEntry;

export interface BaseLogEntry {
  id: string; // log ID
  type: LogEntryType;
  experimentId: string;
  cohortId: string;
  stageId: string;
  userProfile: UserProfile | null; // user profile of participant/mediator
  publicId: string; // Public ID of participant/mediator
  privateId: string; // Private ID of participant/mediator
  description: string;
  createdTimestamp: UnifiedTimestamp; // Timestamp created
}

export enum LogEntryType {
  MODEL = 'model',
}

export interface ModelLogEntry extends BaseLogEntry {
  type: LogEntryType.MODEL;
  prompt: string;
  response: ModelResponse;
  // Time API call was made
  queryTimestamp: UnifiedTimestamp | null;
  // Time API response was received
  responseTimestamp: UnifiedTimestamp | null;
}

export function createModelLogEntry(
  config: Partial<ModelLogEntry> = {},
): ModelLogEntry {
  return {
    id: config.id ?? generateId(),
    type: LogEntryType.MODEL,
    experimentId: config.experimentId ?? '',
    cohortId: config.cohortId ?? '',
    stageId: config.stageId ?? '',
    userProfile: config.userProfile ?? null,
    publicId: config.publicId ?? '',
    privateId: config.privateId ?? '',
    description: config.description ?? '',
    prompt: config.prompt ?? '',
    response: {status: ModelResponseStatus.UNKNOWN_ERROR},
    createdTimestamp: config.createdTimestamp ?? Timestamp.now(),
    queryTimestamp: config.queryTimestamp ?? null,
    responseTimestamp: config.responseTimestamp ?? null,
  };
}
