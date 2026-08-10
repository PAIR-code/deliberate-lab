import {createHash} from 'crypto';
import {UnifiedTimestamp} from '@deliberation-lab/utils';

/**
 * Persona bank: pre-generated personas stored per experiment, keyed by a
 * content hash of the round's resolved variables. Spawned agents claim a
 * stored persona instead of generating a fresh one; what a persona contains
 * is experiment-defined.
 */
/** A stored persona document at experiments/{id}/personas/{personaId}. */
export interface StoredPersona {
  id: string;
  // SHA-256 of the canonical round-variable map (see personaMatchHash).
  hash: string;
  // The round variables this persona was generated for (inspection only).
  variables: Record<string, unknown>;
  // Persona content is experiment-defined; fields beyond the bookkeeping ones
  // are stored as-is. The runtime reads two optional text fields: `content`
  // (appended to the claiming agent's prompt) and `sketch` (a plain persona
  // for agents that need one of their own).
  content?: string;
  sketch?: string;
  // Reuse bookkeeping: fewest-used personas are claimed first; a persona is
  // never claimed twice by the same participant.
  usageCount: number;
  usedBy: string[];
  createdAt: UnifiedTimestamp;
  [field: string]: unknown;
}

/**
 * Choose which persona to claim from the candidates that share a match hash:
 * never one this participant has already used (so each participant sees a
 * distinct persona per slot across their whole run), and otherwise the
 * fewest-used (so reuse is spread evenly across participants), with a
 * deterministic id tie-break. Returns null when every candidate is exhausted
 * for this participant. Pure so the selection rule is unit-testable; the
 * transactional claim that wraps it lives in firestore.ts.
 */
export function selectPersonaToClaim(
  personas: StoredPersona[],
  participantPrivateId: string,
): StoredPersona | null {
  const candidates = personas.filter(
    (p) => !(p.usedBy ?? []).includes(participantPrivateId),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const ua = a.usageCount ?? 0;
    const ub = b.usageCount ?? 0;
    if (ua !== ub) return ua - ub;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return candidates[0];
}

/**
 * Deterministic JSON: object keys sorted recursively, arrays kept in order, no
 * insignificant whitespace. Any external persona generator must serialize
 * identically.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonicalStringify(
            (value as Record<string, unknown>)[k],
          )}`,
      )
      .join(',')}}`;
  }
  // string | number | boolean.
  return JSON.stringify(value);
}

/**
 * The persona bank match key: a SHA-256 (hex) of the canonical serialization of
 * the round-resolved variable map. Any change to a variable's literal content
 * yields a different hash.
 */
export function personaMatchHash(
  roundVariables: Record<string, unknown>,
): string {
  return createHash('sha256')
    .update(canonicalStringify(roundVariables))
    .digest('hex');
}

/**
 * Resolve every template variable to its value for the given round index,
 * mirroring how applyHoistedTreatment / the prompt resolver pick `name.index`.
 * Array-valued variables (random permutations) are indexed at `index`; a bare
 * object value is used as-is; anything that is not JSON is dropped (it can hold
 * no content the persona depends on). The result is the object that is hashed
 * at spawn.
 */
export function computeRoundVariableMap(
  variableMap: Record<string, string> | undefined,
  index: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(variableMap ?? {})) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue; // non-JSON variables carry no hashable content
    }
    if (Array.isArray(parsed)) {
      if (index >= 0 && index < parsed.length) result[name] = parsed[index];
    } else if (parsed && typeof parsed === 'object') {
      result[name] = parsed;
    }
  }
  return result;
}
