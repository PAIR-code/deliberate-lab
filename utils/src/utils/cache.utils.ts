/** Lazily instanciate a value */
export class Lazy<T> {
  private value: T | undefined;

  constructor(private readonly factory: () => T) {}

  get(): T {
    if (!this.value) {
      this.value = this.factory();
    }
    return this.value;
  }

  clear(destructor?: (value: T) => void) {
    if (!this.value) return;
    destructor?.(this.value);
    this.value = undefined;
  }
}

/** Cache values in a map with lazy instanciation */
export class CacheMap<K, V> {
  private map = new Map<K, V>();

  constructor(private readonly factory: (key: K) => V) {}

  get(key: K): V {
    if (!this.map.has(key)) {
      this.map.set(key, this.factory(key));
    }
    return this.map.get(key)!;
  }

  remove(key: K, destructor?: (value: V) => void) {
    const value = this.map.get(key);

    if (!value) return;
    this.map.delete(key);
    destructor?.(value);
  }

  clear(destructor?: (value: V) => void) {
    this.map.forEach((value, key) => {
      destructor?.(value);
      this.map.delete(key);
    });
  }
}

/** Run a callback only once depending on a specific key.
 * This is useful during automatic progressions / operations where you need to perform a specific action only once,
 * and when a specific condition is met. Because angular signals can change often, this utility ensures that the action is performed only once.
 *
 * Use this class when you need to perform an action only once, in a context of race conditions.
 */
export class Once<Key> {
  private value: Key | undefined;

  /** Run the callback function only if the internal key is not already set to the given one.
   * This makes sure that the callback is run only once, and only if the key is different from the previous one.
   */
  run(key: Key, callback: () => unknown) {
    if (this.value === key) return;

    this.value = key;
    callback();
  }
}

/** Return a promise that can be resolved externally in order to lock processes.
 * This is useful to wait for Angular @ViewChild elements to be set before performing reactive
 * actions that cannot be done in Angular lifecycle hooks (like an effect that depends on signals).
 */
export const lockPromise = () => {
  let resolve = () => {};
  let reject = () => {};

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {promise, resolve, reject} as const;
};
