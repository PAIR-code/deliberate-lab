import {ModelResponse, ModelResponseStatus, StoredFile} from './model_response';
import {UserProfile} from './participant';
import {UnifiedTimestamp, generateId} from './shared';
import {Timestamp} from 'firebase/firestore';

/** Define experiment log. */
export type LogEntry = ModelLogEntry;

export interface BaseLogEntry {
  id: string; // log ID
  type: LogEntryType;
  experimentId: string; // path to file log under
  cohortId: string; // path to file log under
  participantId: string; // path to file log under
  stageId: string; // path to file log under
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
  // Uploaded files (images, documents, etc.)
  files?: StoredFile[];
}

export function createModelLogEntry(
  config: Partial<ModelLogEntry> = {},
): ModelLogEntry {
  return {
    id: config.id ?? generateId(),
    type: LogEntryType.MODEL,
    experimentId: config.experimentId ?? '',
    cohortId: config.cohortId ?? '',
    participantId: config.participantId ?? '',
    stageId: config.stageId ?? '',
    userProfile: config.userProfile ?? null,
    publicId: config.publicId ?? '',
    privateId: config.privateId ?? '',
    description: config.description ?? '',
    prompt: config.prompt ?? '',
    response: config.response ?? {status: ModelResponseStatus.NONE},
    createdTimestamp: config.createdTimestamp ?? Timestamp.now(),
    queryTimestamp: config.queryTimestamp ?? null,
    responseTimestamp: config.responseTimestamp ?? null,
  };
}
