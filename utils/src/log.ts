import {ModelResponse, ModelResponseStatus} from './model_response';
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
  participantId: string; // Public ID
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
  queryTimestamp: UnifiedTimestamp;
  // Time API response was received
  responseTimestamp: UnifiedTimestamp;
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
    participantId: config.participantId ?? '',
    description: config.description ?? '',
    prompt: config.prompt ?? '',
    response: {status: ModelResponseStatus.UNKNOWN_ERROR},
    createdTimestamp: config.createdTimestamp ?? Timestamp.now(),
    queryTimestamp: config.queryTimestamp ?? Timestamp.now(),
    responseTimestamp: config.responseTimestamp ?? Timestamp.now(),
  };
}
