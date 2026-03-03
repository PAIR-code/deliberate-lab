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

// ====================================================================
// Log status bar: time-bucketed success/error counts
// ====================================================================

/** A single time bucket for the status bar. */
export interface LogStatusBucket {
  /** Start of this time bucket (ms since epoch). */
  startMs: number;
  /** End of this time bucket (ms since epoch). */
  endMs: number;
  /** Number of successful (OK) logs in this bucket. */
  successCount: number;
  /** Number of error (non-OK) logs in this bucket. */
  errorCount: number;
}

/** Predefined status bar time ranges. */
export type StatusBarRange = '1h' | '6h' | '12h' | 'all';

const BUCKET_COUNT = 60;

/** Config for fixed time ranges. */
export const STATUS_BAR_CONFIGS: Record<
  string,
  {label: string; totalMs: number; bucketMs: number}
> = {
  '1h': {
    label: '1h',
    totalMs: 60 * 60 * 1000,
    bucketMs: 60 * 1000,
  },
  '6h': {
    label: '6h',
    totalMs: 6 * 60 * 60 * 1000,
    bucketMs: 6 * 60 * 1000,
  },
  '12h': {
    label: '12h',
    totalMs: 12 * 60 * 60 * 1000,
    bucketMs: 12 * 60 * 1000,
  },
};

/** Get timestamp in ms for a log entry. */
function getLogTimestampMs(log: LogEntry): number | null {
  const ts =
    log.type === LogEntryType.MODEL
      ? ((log as ModelLogEntry).responseTimestamp ??
        (log as ModelLogEntry).queryTimestamp)
      : null;
  return ts ? ts.seconds * 1000 : null;
}

/** Bucket logs into time slots for the status bar. */
export function getLogStatusBuckets(
  logs: LogEntry[],
  range: StatusBarRange,
  nowMs: number = Date.now(),
): LogStatusBucket[] {
  let startMs: number;
  let bucketMs: number;

  if (range === 'all') {
    // Compute range from earliest to latest log
    let earliest = nowMs;
    let latest = 0;
    for (const log of logs) {
      const logMs = getLogTimestampMs(log);
      if (logMs === null) continue;
      if (logMs < earliest) earliest = logMs;
      if (logMs > latest) latest = logMs;
    }
    if (latest === 0) {
      earliest = nowMs;
      latest = nowMs;
    }
    const totalMs = Math.max(latest - earliest, 60 * 1000); // At least 1 min
    startMs = earliest;
    bucketMs = Math.ceil(totalMs / BUCKET_COUNT);
  } else {
    const config = STATUS_BAR_CONFIGS[range];
    startMs = nowMs - config.totalMs;
    bucketMs = config.bucketMs;
  }

  // Initialize empty buckets
  const buckets: LogStatusBucket[] = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const bucketStart = startMs + i * bucketMs;
    buckets.push({
      startMs: bucketStart,
      endMs: bucketStart + bucketMs,
      successCount: 0,
      errorCount: 0,
    });
  }

  // Fill buckets with log data
  for (const log of logs) {
    if (log.type !== LogEntryType.MODEL) continue;
    const logMs = getLogTimestampMs(log);
    if (logMs === null) continue;
    if (logMs < startMs) continue;

    const bucketIndex = Math.min(
      Math.floor((logMs - startMs) / bucketMs),
      BUCKET_COUNT - 1,
    );
    if (bucketIndex < 0) continue;

    if ((log as ModelLogEntry).response?.status === ModelResponseStatus.OK) {
      buckets[bucketIndex].successCount++;
    } else {
      buckets[bucketIndex].errorCount++;
    }
  }

  return buckets;
}
