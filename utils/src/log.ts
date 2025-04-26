import {UnifiedTimestamp, generateId} from './shared';
import {Timestamp} from 'firebase/firestore';

/** Define experiment log. */

export interface LogEntry {
  id: string;
  experimentId: string;
  cohortId: string;
  stageId: string;
  participantId: string; // Public ID
  summary: string; // Summary of log
  trace: string; // Longer log data, e.g., prompt or LLM response
  timestamp: UnifiedTimestamp;
}

export function createLogEntry(config: Partial<LogEntry> = {}): LogEntry {
  return {
    id: config.id ?? generateId(),
    experimentId: config.experimentId ?? '',
    cohortId: config.cohortId ?? '',
    stageId: config.stageId ?? '',
    participantId: config.participantId ?? '',
    summary: config.summary ?? '',
    trace: config.trace ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}
