import {LogEntry, LogEntryType, ModelLogEntry} from './log';

import {ModelResponseStatus} from './model_response';

/** Functions for filtering logs in the experimenter dashboard. */

/**
 * Log status filter values: 'success', 'all_errors', or specific
 * ModelResponseStatus codes for individual error types.
 */
export type LogStatusFilter = 'success' | 'all_errors' | ModelResponseStatus;

/** Display labels for the top-level status filter options. */
export const LOG_STATUS_FILTER_LABELS: Record<string, string> = {
  success: 'Success',
  all_errors: 'Errors',
};

/** Error-only ModelResponseStatus codes (excludes OK). */
export const LOG_ERROR_CODES: ModelResponseStatus[] = Object.values(
  ModelResponseStatus,
).filter((s) => s !== ModelResponseStatus.OK);

export interface FilterState {
  cohort: string | null;
  participant: string | null;
  stage: string | null;
  statusFilters: Set<LogStatusFilter>;
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

  if (filters.statusFilters.size > 0) {
    filtered = filtered.filter((l): l is ModelLogEntry => {
      if (l.type !== LogEntryType.MODEL) return false;
      const status = l.response?.status;
      const isSuccess = status === ModelResponseStatus.OK;
      if (filters.statusFilters.has('success') && isSuccess) return true;
      if (filters.statusFilters.has('all_errors') && !isSuccess) return true;
      // Check for specific error codes
      if (status && filters.statusFilters.has(status as LogStatusFilter)) {
        return true;
      }
      return false;
    });
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
