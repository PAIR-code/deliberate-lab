import {UnifiedTimestamp, generateId} from './shared';
import {Timestamp} from 'firebase/firestore';

/** Alert types and functions. */

export interface AlertMessage {
  id: string;
  experimentId: string;
  cohortId: string;
  stageId: string;
  participantId: string; // private ID of participant
  message: string; // message from participant
  timestamp: UnifiedTimestamp; // time that message was sent
  responses: string[]; // responses from experimenter
  status: AlertStatus;
}

export enum AlertStatus {
  NEW = 'new', // sent by participant but not acknowledged by experimenter
  READ = 'read', // read by experimenter
  RESOLVED = 'resolved', // resolved by experimenter
}

export function createAlertMessage(
  config: Partial<AlertMessage> = {},
): AlertMessage {
  return {
    id: config.id ?? generateId(),
    experimentId: config.experimentId ?? '',
    cohortId: config.cohortId ?? '',
    stageId: config.stageId ?? '',
    participantId: config.participantId ?? '',
    message: config.message ?? '',
    responses: config.responses ?? [],
    timestamp: config.timestamp ?? Timestamp.now(),
    status: config.status ?? AlertStatus.NEW,
  };
}
