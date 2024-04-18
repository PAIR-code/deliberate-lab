import { WritableSignal } from '@angular/core';

// Edit a value, forcing an update.
export function editSignalFn<T>(s: WritableSignal<T>): (f: (x: T) => T | void) => T {
  function editfn(f: (x: T) => T | void): T {
    let value = s();
    const maybeNewValue = f(value);
    if (maybeNewValue) {
      value = maybeNewValue;
    }
    const valueWithNewRef = { ...value };
    s.set(valueWithNewRef);
    return valueWithNewRef;
  }
  return editfn;
}
