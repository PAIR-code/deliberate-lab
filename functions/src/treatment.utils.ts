import {StageKind, TransferStageConfig} from '@deliberation-lab/utils';

import {getFirestoreStage} from './utils/firestore';

/**
 * Helpers for reading per-round treatment flags BEFORE the treatment is
 * hoisted onto the participant.
 *
 * Supports within-subjects designs where `treatment` is a per-participant
 * random permutation of condition objects and each round runs
 *   ...private chat -> transfer -> group chat...
 * Treatment is hoisted onto participant fields only at the transfer (see
 * applyHoistedTreatment), which is AFTER the private chat. So anything the
 * private chat needs from the round's treatment (e.g. whether the mediator should
 * appear as the participant's representative) must be read directly from the
 * treatment value for that round rather than from a hoisted field.
 */

/**
 * True if the treatment selected for round `index` sets `key` to `true`.
 * Mirrors applyHoistedTreatment's parsing: handles the array form (a single
 * `treatment` variable holding `[t0, t1, t2]`) and the expanded `name_N` form
 * (`treatment_1`, `treatment_2`, ...). Scans every variable so multiple
 * treatment-like variables are all considered.
 */
function treatmentFlagAtIndex(
  variableMap: Record<string, string> | undefined,
  index: number,
  key: string,
): boolean {
  if (!variableMap) return false;
  for (const [name, value] of Object.entries(variableMap)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue; // Not JSON, skip.
    }
    let treatment: unknown;
    if (Array.isArray(parsed)) {
      treatment = parsed[index];
    } else if (parsed && typeof parsed === 'object') {
      const suffix = name.match(/_(\d+)$/);
      if (suffix && Number(suffix[1]) !== index + 1) continue;
      treatment = parsed;
    } else {
      continue;
    }
    if (
      treatment &&
      typeof treatment === 'object' &&
      (treatment as Record<string, unknown>)[key] === true
    ) {
      return true;
    }
  }
  return false;
}

/**
 * True if ANY of the participant's treatment conditions sets
 * `_skipPrivateChats`. Read directly from the treatment (not a hoisted field)
 * so it covers private chats that precede the transfer where treatment is
 * hoisted. Round-INDEPENDENT: when set on any round, this reports true for the
 * whole participant. Prefer `treatmentAtIndexSkipsPrivateChats` to decide a
 * specific round's private chat (a participant's rounds can differ on this);
 * this round-independent form is only a fallback
 * for when a private chat can't be attributed to a round.
 */
export function treatmentSkipsPrivateChats(
  variableMap: Record<string, string> | undefined,
): boolean {
  if (!variableMap) return false;
  for (const value of Object.values(variableMap)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue; // Not JSON, skip.
    }
    const conditions = Array.isArray(parsed) ? parsed : [parsed];
    for (const condition of conditions) {
      if (
        condition &&
        typeof condition === 'object' &&
        (condition as Record<string, unknown>)['_skipPrivateChats'] === true
      ) {
        return true;
      }
    }
  }
  return false;
}

/** True if the treatment selected for round `index` sets `_hasRepresentative`. */
export function treatmentAtIndexHasRepresentative(
  variableMap: Record<string, string> | undefined,
  index: number,
): boolean {
  return treatmentFlagAtIndex(variableMap, index, '_hasRepresentative');
}

/** True if the treatment selected for round `index` sets `_skipPrivateChats`. */
export function treatmentAtIndexSkipsPrivateChats(
  variableMap: Record<string, string> | undefined,
  index: number,
): boolean {
  return treatmentFlagAtIndex(variableMap, index, '_skipPrivateChats');
}

/**
 * For a private chat at `privateChatIndex`, return the treatment
 * index of the round it belongs to, i.e. the `treatmentIndex` of the next
 * transfer stage (each round runs ...private chat -> transfer -> group
 * chat...). Returns
 * null if no attributable transfer is found (e.g. another private chat appears
 * first, or there is no following transfer).
 */
export async function getRoundTreatmentIndex(
  experimentId: string,
  stageIds: string[],
  privateChatIndex: number,
): Promise<number | null> {
  for (let i = privateChatIndex + 1; i < stageIds.length; i++) {
    const stage = await getFirestoreStage(experimentId, stageIds[i]);
    if (stage?.kind === StageKind.TRANSFER) {
      const treatmentIndex = (stage as TransferStageConfig).treatmentIndex;
      return typeof treatmentIndex === 'number' ? treatmentIndex : null;
    }
    // Another private chat before any transfer => can't attribute a round.
    if (stage?.kind === StageKind.PRIVATE_CHAT) return null;
  }
  return null;
}
