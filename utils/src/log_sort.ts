import {LogEntry, LogEntryType, ModelLogEntry} from './log';

import {ModelResponseStatus} from './model_response';

/** Functions for filtering logs in the experimenter dashboard. */

export interface FilterState {
  cohort: string | null;
  participant: string | null;
  stage: string | null;
  status: string | null;
  sortMode: 'newest' | 'oldest';
}

export function filterLogs(
  logs: LogEntry[],
  filters: FilterState,
  getCohortName: (id: string) => string,
): LogEntry[] {
  let filtered = [...logs];

  if (filters.cohort) {
    filtered = filtered.filter(
      (l) => getCohortName(l.cohortId) === filters.cohort,
    );
  }

  if (filters.participant) {
    filtered = filtered.filter(
      (l) => l.userProfile?.publicId === filters.participant,
    );
  }

  if (filters.stage) {
    filtered = filtered.filter((l) => l.stageId === filters.stage);
  }

  if (filters.status) {
    filtered = filtered.filter(
      (l): l is ModelLogEntry =>
        l.type === LogEntryType.MODEL && l.response?.status === filters.status,
    );
  }

  filtered.sort((a, b) => {
    const tA = Number(a.responseTimestamp ?? a.queryTimestamp ?? 0);
    const tB = Number(b.responseTimestamp ?? b.queryTimestamp ?? 0);
    return filters.sortMode === 'newest' ? tB - tA : tA - tB;
  });

  return filtered;
}

export function getCohortOptions(
  logs: LogEntry[],
  selectedParticipant: string | null,
  getCohortName: (id: string) => string,
): string[] {
  // If participant selected, only allow that cohort
  if (selectedParticipant) {
    const cohortId = logs.find(
      (l) => l.userProfile?.publicId === selectedParticipant,
    )?.cohortId;
    return cohortId ? [getCohortName(cohortId)] : [];
  }

  const names = logs.map((l) => getCohortName(l.cohortId));
  return [...new Set(names)];
}

export function getParticipantOptions(
  logs: LogEntry[],
  selectedCohort: string | null,
  getCohortName: (id: string) => string,
): string[] {
  let list = logs;
  if (selectedCohort) {
    list = list.filter((l) => getCohortName(l.cohortId) === selectedCohort);
  }
  return [...new Set(list.map((l) => l.userProfile?.publicId ?? ''))].filter(
    Boolean,
  );
}

export function getStageOptions(
  logs: LogEntry[],
  filters: Pick<FilterState, 'cohort' | 'participant'>,
  getCohortName: (id: string) => string,
): string[] {
  let list = logs;

  if (filters.cohort) {
    list = list.filter((l) => getCohortName(l.cohortId) === filters.cohort);
  }

  if (filters.participant) {
    list = list.filter((l) => l.userProfile?.publicId === filters.participant);
  }

  return [...new Set(list.map((l) => l.stageId ?? '').filter(Boolean))];
}

export function getStatusOptions(
  logs: LogEntry[],
  filters: Pick<FilterState, 'cohort' | 'participant' | 'stage'>,
  getCohortName: (id: string) => string,
): ModelResponseStatus[] {
  let list = logs;

  if (filters.cohort) {
    list = list.filter((l) => getCohortName(l.cohortId) === filters.cohort);
  }

  if (filters.participant) {
    list = list.filter((l) => l.userProfile?.publicId === filters.participant);
  }

  if (filters.stage) {
    list = list.filter((l) => l.stageId === filters.stage);
  }

  return [
    ...new Set(
      list.flatMap((l) =>
        l.type === LogEntryType.MODEL ? [l.response.status] : [],
      ),
    ),
  ];
}
