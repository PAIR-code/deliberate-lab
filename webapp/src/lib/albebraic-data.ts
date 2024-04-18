export interface AlgebraicData<Data> {
  kind: string;
  data: Data;
}

enum Foo {
  bar = 'bar',
  ugg = 'ugg',
}

interface UggData extends AlgebraicData<object> {
  kind: Foo.ugg;
  data: { uggName: string };
}

interface BarData extends AlgebraicData<object> {
  kind: Foo.bar;
  data: { barNumber: number };
}

type FooData = BarData | UggData;

const bar: BarData = {
  kind: Foo.bar,
  data: { barNumber: 5 },
};

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

export function isOfKind<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T,
  kind: K,
): objMaybeOfKind is T & { kind: K } {
  return objMaybeOfKind.kind === kind;
}

//

const foo = bar as never as FooData;

const test = getKindData(Foo.bar, foo);
// typeof test === BarData['data'] !

const test2 = castToKind(Foo.bar, foo);
// typeof test2 === BarData

if (isOfKind(foo, Foo.bar)) {
  foo.data.barNumber += 1;
}

// // Elaborate data getter that in the presense of a kind gets the right kind of data.
// export function getKindData<K extends FooData['kind'], T extends FooData & { kinds: K }>(
//   kind: K,
//   foo: T,
// ): T extends AlgebraicData<infer Kind> ? Kind : never {
//   return foo.data as T extends AlgebraicData<infer Kind> ? Kind : never;
// }
