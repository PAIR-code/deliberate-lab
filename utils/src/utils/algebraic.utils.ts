export interface AlgebraicData<Data> {
  kind: string;
  data: Data;
}

// Elaborate data getter that in the presense of a kind gets the right kind of data.
export function getKindData<T extends AlgebraicData<object>, K extends T['kind']>(
  kind: K,
  foo: T,
): T & { kind: K } extends AlgebraicData<infer Data> ? Data : never {
  return foo.data as T & { kind: K } extends AlgebraicData<infer Data> ? Data : never;
}

// Elaborate data getter that in the presense of a kind gets the right kind of data.
export function castToKind<T extends { kind: string }, K extends T['kind']>(
  kind: K,
  foo: T,
): T & { kind: K } {
  return foo as T & { kind: K };
}

// When the field "kind" is used to denote a type (a discriminated union), then this
// returns null if the object is not of that kind, and otherwise returns the object
// (but with the more specific type)
export function tryCast<T extends { kind: string }, K extends T['kind']>(
  kind: K,
  objMaybeOfKind: T,
): (T & { kind: K }) | null {
  if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    return null;
  }
}

export function assertCast<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T,
  kind: K,
): T & { kind: K } {
  if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    throw new Error(`Given object with kind=${objMaybeOfKind.kind} needs to have kind=${kind}`);
  }
}

export function assertCastOrUndefined<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T | undefined,
  kind: K,
): (T & { kind: K }) | undefined {
  if (objMaybeOfKind === undefined) {
    return undefined;
  } else if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    throw new Error(`Given object with kind=${objMaybeOfKind.kind} needs to have kind=${kind}`);
  }
}

export function isOfKind<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T,
  kind: K,
): objMaybeOfKind is T & { kind: K } {
  return objMaybeOfKind.kind === kind;
}

let _uniqueId = 0;

/** Returns a unique ID */
export const uniqueId = (prefix?: string) => {
  return prefix ? `${prefix}${_uniqueId++}` : `${_uniqueId++}`;
};
